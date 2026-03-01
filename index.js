#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const fm = require('front-matter');
const { WxConverter } = require('./converter');
const { listThemes, loadCustomTheme } = require('./themes');

const program = new Command();

program
  .name('wx-format')
  .description('微信公众号 Markdown 排版工具 v3.0')
  .version('3.0.1')
  .enablePositionalOptions()
  .argument('[input]', 'Markdown 文件路径 (省略则从 stdin 读取)')
  .option('-t, --theme <name>', '主题名称或自定义主题 JSON 路径', 'simple')
  .option('-o, --output <path>', '输出 HTML 文件路径')
  .option('-c, --clipboard', '复制到剪贴板', true)
  .option('-p, --preview', '在浏览器中预览')
  .option('--no-clipboard', '不复制到剪贴板')
  .option('-l, --list-themes', '列出所有可用主题')
  .option('--polish <provider>', 'AI 润色 (gemini|deepseek|openai|claude)')
  .option('--polish-type <type>', '润色类型 (grammar|style|title|structure|deai|readability|summary|seo)', 'grammar')
  .option('--api-key <key>', 'AI 润色 API Key')
  .option('--dry-run', '仅打印润色 prompt，不调用 API')
  .option('--prompt-file <path>', '自定义润色 prompt 文件路径 (支持 {{content}} 占位符)')
  .option('--normalize', '中文文本规范化 (标点转换、中英文间距)')
  .option('--normalize-full', '全量中文规范化 (引号/标题/空行/列表/标点/间距)')
  .option('--important', '为所有样式添加 !important (防止平台样式覆盖)')
  .option('--math', '启用 KaTeX 数学公式渲染 ($..$ 行内, $$...$$ 块级)')
  .option('--mermaid', '启用 Mermaid 图表渲染')
  .option('--toc', '生成目录导航')
  .option('--polish-only', '仅润色，输出 Markdown（不转换 HTML）')
  .option('--images', '生成 AI 配图 (Gemini)')
  .option('--image-model <model>', '图像模型', 'gemini-3-pro-image-preview')
  .option('--cover', '生成 AI 封面图')
  .option('--cover-style <style>', '封面风格 (hero|conceptual|typography|metaphor|minimal)')
  .option('--cover-palette <palette>', '封面配色 (warm|cool|dark|vivid|pastel|mono)')
  .option('--cover-ratio <ratio>', '封面比例 (2.35:1|16:9|1:1)', '2.35:1')
  .option('--image-density <density>', '配图密度 (minimal|balanced|rich)', 'balanced')
  .option('--image-style <style>', '配图风格 (notion|warm|minimal|blueprint|watercolor)')
  .option('--publish <target>', '发布到平台 (wechat)')
  .option('--publish-method <method>', '发布方式 (api)', 'api')
  .option('--publish-title <title>', '发布文章标题')
  .option('--publish-author <author>', '发布文章作者')
  .option('--draft-only', '仅保存为草稿，不发布', true)
  .action(async (input, options) => {
    if (options.listThemes) {
      console.log('可用主题:');
      listThemes().forEach(t => console.log(`  ${t}`));
      return;
    }

    let raw, inputPath;
    if (input) {
      inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(`文件不存在: ${inputPath}`);
        process.exit(1);
      }
      const stat = fs.statSync(inputPath);
      if (stat.size === 0) {
        console.error('错误: 文件为空');
        process.exit(1);
      }
      if (stat.size > 10 * 1024 * 1024) {
        console.error('文件超过 10MB，拒绝处理');
        process.exit(1);
      }
      if (stat.size > 1024 * 1024) {
        console.warn('警告: 文件超过 1MB，处理可能较慢');
      }
      if (!inputPath.endsWith('.md')) {
        console.warn('警告: 输入文件不是 .md 格式');
      }
      raw = fs.readFileSync(inputPath, 'utf-8');
    } else {
      if (process.stdin.isTTY) {
        program.help();
        return;
      }
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      raw = Buffer.concat(chunks).toString('utf-8');
    }

    if (!raw || !raw.trim()) {
      console.error('错误: 输入内容为空');
      process.exit(1);
    }

    const { attributes, body } = fm(raw);
    let markdown = body;

    // Full normalization (before polish/conversion)
    if (options.normalizeFull) {
      const { normalizeFull } = require('./normalizer');
      const result = normalizeFull(markdown);
      markdown = result.text;
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.warn(`⚠ ${w}`));
      }
    }

    // AI polish
    if (options.polish) {
      const { ContentPolisher } = require('./polisher');
      const polisher = new ContentPolisher({
        provider: options.polish,
        apiKey: options.apiKey,
        polishType: options.polishType,
        dryRun: options.dryRun,
        promptFile: options.promptFile,
      });
      markdown = await polisher.polish(markdown);
      if (options.dryRun) return;
    }

    // Polish-only mode: output markdown, skip HTML conversion
    if (options.polishOnly) {
      const outputPath = options.output
        ? path.resolve(options.output)
        : inputPath.replace(/\.md$/, '-polished.md');
      fs.writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`润色完成: ${outputPath}`);
      return;
    }

    // Theme: support custom JSON path
    let theme = attributes.theme || options.theme;
    if (theme.endsWith('.json')) {
      loadCustomTheme(path.resolve(theme));
      theme = path.basename(theme, '.json');
    }

    try {
      const converter = new WxConverter({ theme, normalize: options.normalize, important: options.important, math: options.math, mermaid: options.mermaid, toc: options.toc });
      let html = converter.convert(markdown);

      // AI image generation (multi-image)
      if (options.images) {
        const { ImageGenerator } = require('./image-gen');
        const imgGen = new ImageGenerator({
          apiKey: options.apiKey,
          model: options.imageModel,
          dryRun: options.dryRun,
        });
        const imageResults = await imgGen.generateMultiple(markdown, theme, {
          density: options.imageDensity,
          imageStyle: options.imageStyle,
        });
        if (options.dryRun) return;
        if (imageResults.length > 0) html = imgGen.insertImages(html, imageResults);
      }

      // Cover image generation
      if (options.cover) {
        const { CoverGenerator } = require('./cover');
        const coverGen = new CoverGenerator({
          apiKey: options.apiKey,
          model: options.imageModel,
          dryRun: options.dryRun,
        });
        const coverImage = await coverGen.generate(markdown, {
          style: options.coverStyle,
          palette: options.coverPalette,
          ratio: options.coverRatio,
        });
        if (options.dryRun) return;
        if (coverImage) html = coverGen.insertCover(html, coverImage);
      }

      const fullHtml = wrapHtml(html, theme);

      if (!input && !options.output) {
        process.stdout.write(fullHtml);
        return;
      }

      const outputPath = options.output
        ? path.resolve(options.output)
        : inputPath.replace(/\.md$/, '.html');
      fs.writeFileSync(outputPath, fullHtml, 'utf-8');
      console.log(`已生成: ${outputPath}`);

      if (options.clipboard) {
        try {
          const { default: clipboardy } = await import('clipboardy');
          await clipboardy.write(html);
          console.log('已复制到剪贴板 (可直接粘贴到公众号编辑器)');
        } catch { console.error('剪贴板复制失败'); }
      }
      if (options.preview) {
        const { exec } = require('child_process');
        exec(`open "${outputPath}"`);
      }

      // Publish to platform
      if (options.publish) {
        const { PublishManager } = require('./publish');
        const pm = new PublishManager();
        try {
          const result = await pm.publish(html, {
            target: options.publish,
            method: options.publishMethod,
            title: options.publishTitle || attributes.title || path.basename(inputPath || 'article', '.md'),
            author: options.publishAuthor || attributes.author || '',
            digest: attributes.digest || '',
            contentSourceUrl: attributes.content_source_url || '',
            draftOnly: options.draftOnly,
          });
          console.log(`发布完成: media_id=${result.media_id}, status=${result.status}`);
          if (result.publish_id) console.log(`publish_id=${result.publish_id}`);
        } catch (pubErr) {
          console.error(`发布失败: ${pubErr.message}`);
        }
      }
    } catch (err) {
      console.error(`转换失败: ${err.message}`);
      process.exit(1);
    }
  });

function wrapHtml(content, themeName) {
  return `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>wx-format [${themeName}]</title>\n<style>\nbody{max-width:680px;margin:40px auto;padding:0 20px;background:#f5f5f5}\n.wx-content{background:#fff;padding:30px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)}\n</style>\n</head>\n<body>\n<div class="wx-content">${content}</div>\n</body>\n</html>`;
}

// Topic subcommand
program
  .command('topic')
  .description('公众号选题：AI 智能选题建议')
  .option('--niche <keywords>', '领域关键词 (逗号分隔)', '通用')
  .option('--provider <name>', 'AI provider (gemini|deepseek|openai|claude)', 'gemini')
  .option('--api-key <key>', 'AI API Key')
  .option('--dry-run', '仅打印分析 prompt')
  .option('--json', 'JSON 格式输出')
  .option('-o, --output <path>', '输出文件路径')
  .option('--format <type>', '输出格式 (table|structured)', 'table')
  .action(async (options) => {
    const { runTopic } = require('./topic');
    await runTopic({
      niche: options.niche,
      provider: options.provider,
      apiKey: options.apiKey,
      dryRun: options.dryRun,
      json: options.json,
      output: options.output ? require('path').resolve(options.output) : undefined,
      format: options.format,
    });
  });

// Write subcommand
program
  .command('write [viewpoints]')
  .description('观点→完整公众号文章 (AI 写作)')
  .option('--type <type>', '文章类型 (opinion|tutorial|listicle|commentary|story)', 'opinion')
  .option('--provider <name>', 'AI provider (gemini|deepseek|openai|claude)', 'gemini')
  .option('--api-key <key>', 'AI API Key')
  .option('--dry-run', '仅打印 prompt，不调用 API')
  .option('--no-confirm', '跳过大纲确认，直接扩写')
  .option('--list-types', '列出所有文章类型')
  .option('--polish <provider>', '写完后 AI 润色')
  .option('--polish-type <type>', '润色类型', 'deai')
  .option('-t, --theme <name>', '排版主题 (触发排版转换)')
  .option('-o, --output <path>', '输出 HTML 文件路径')
  .option('--outline-only', '仅输出大纲，不扩写全文')
  .option('--title-candidates <n>', '标题候选数量', '5')
  .action(async (viewpoints, options) => {
    const { runWrite, listArchetypes } = require('./writer');
    if (options.listTypes) {
      console.log('可用文章类型:');
      listArchetypes().forEach(a => console.log(`  ${a.key.padEnd(12)} ${a.name} - ${a.desc}`));
      return;
    }
    let input = viewpoints;
    if (input && fs.existsSync(path.resolve(input))) {
      input = fs.readFileSync(path.resolve(input), 'utf-8').trim();
    }
    if (!input) { console.error('请提供观点内容或文件路径'); process.exit(1); }

    const markdown = await runWrite({
      viewpoints: input,
      type: options.type,
      provider: options.provider,
      apiKey: options.apiKey,
      dryRun: options.dryRun,
      noConfirm: !options.confirm,
      outlineOnly: options.outlineOnly,
      titleCandidates: parseInt(options.titleCandidates),
    });
    if (!markdown) return;

    let result = markdown;
    // Optional polish chain
    if (options.polish) {
      const { ContentPolisher } = require('./polisher');
      const polisher = new ContentPolisher({
        provider: options.polish,
        apiKey: options.apiKey,
        polishType: options.polishType,
      });
      result = await polisher.polish(result);
    }
    // Optional format conversion
    if (options.theme) {
      const converter = new WxConverter({ theme: options.theme });
      const html = converter.convert(result);
      const fullHtml = wrapHtml(html, options.theme);
      if (options.output) {
        fs.writeFileSync(path.resolve(options.output), fullHtml, 'utf-8');
        console.log(`已生成: ${options.output}`);
      } else {
        process.stdout.write(fullHtml);
      }
    } else if (options.output) {
      fs.writeFileSync(path.resolve(options.output), result, 'utf-8');
      console.log(`已生成: ${options.output}`);
    } else {
      process.stdout.write(result + '\n');
    }
  });

// Infographic subcommand
program
  .command('infographic <input>')
  .description('信息图生成：从 Markdown 内容生成信息图')
  .option('--layout <layout>', '布局类型 (bento-grid|timeline|pyramid|funnel|matrix|comparison|flowchart|mind-map|cycle|hierarchy|radar|scatter|org-chart|kanban|roadmap|venn|swot|process|dashboard|isometric|stacked-cards)')
  .option('--style <style>', '视觉风格 (hand-drawn|cyberpunk|minimal|watercolor|neon|retro|corporate|editorial|flat|gradient|glassmorphism|brutalist|art-deco|pop-art|line-art|duotone|3d-render|paper-craft|pixel-art|sketch)', 'minimal')
  .option('--ratio <ratio>', '比例 (16:9|9:16|1:1|4:3)', '16:9')
  .option('--api-key <key>', 'Gemini API Key')
  .option('--dry-run', '仅打印 prompt，不调用 API')
  .option('--recommend', '分析内容并推荐布局')
  .option('-o, --output <path>', '输出图片文件路径')
  .action(async (input, options) => {
    const inputPath = path.resolve(input);
    if (!fs.existsSync(inputPath)) {
      console.error(`文件不存在: ${inputPath}`);
      process.exit(1);
    }
    const markdown = fs.readFileSync(inputPath, 'utf-8');
    const { InfographicGenerator } = require('./infographic');
    const gen = new InfographicGenerator({
      apiKey: options.apiKey,
      dryRun: options.dryRun,
    });

    if (options.recommend) {
      const recs = gen.recommend(markdown);
      console.log('推荐布局:');
      recs.forEach((r, i) => console.log(`  ${i + 1}. ${r.layoutLabel} (${r.layout}) - ${r.description}`));
      return;
    }

    const image = await gen.generate(markdown, {
      layout: options.layout,
      style: options.style,
      ratio: options.ratio,
    });
    if (!image) return;

    if (options.output) {
      const outPath = path.resolve(options.output);
      fs.writeFileSync(outPath, Buffer.from(image.data, 'base64'));
      console.log(`信息图已保存: ${outPath}`);
    } else {
      const outPath = inputPath.replace(/\.md$/, '-infographic.png');
      fs.writeFileSync(outPath, Buffer.from(image.data, 'base64'));
      console.log(`信息图已保存: ${outPath}`);
    }
  });

// XHS (小红书) series subcommand
program
  .command('xhs <input>')
  .description('小红书系列图生成：从 Markdown 生成 9:16 卡片系列')
  .option('--style <style>', '视觉风格 (warm|cute|minimal|bold|pastel|neon|vintage|clean|gradient|hand-drawn)', 'warm')
  .option('--layout <layout>', '布局类型 (balanced|text-heavy|image-focus|split|card|list|quote|comparison)', 'balanced')
  .option('--count <n>', '生成图片数量 (1-10)', '5')
  .option('--api-key <key>', 'Gemini API Key')
  .option('--dry-run', '仅打印 prompt，不调用 API')
  .option('-o, --output <dir>', '输出目录')
  .action(async (input, options) => {
    const inputPath = path.resolve(input);
    if (!fs.existsSync(inputPath)) {
      console.error(`文件不存在: ${inputPath}`);
      process.exit(1);
    }
    const markdown = fs.readFileSync(inputPath, 'utf-8');
    const { XhsGenerator } = require('./xhs');
    const gen = new XhsGenerator({
      apiKey: options.apiKey,
      dryRun: options.dryRun,
    });
    const count = Math.min(10, Math.max(1, parseInt(options.count) || 5));
    const images = await gen.generateSeries(markdown, {
      style: options.style,
      layout: options.layout,
      count,
    });
    if (!images || images.length === 0) return;

    const outDir = options.output
      ? path.resolve(options.output)
      : path.dirname(inputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const baseName = path.basename(inputPath, '.md');
    for (let i = 0; i < images.length; i++) {
      const outPath = path.join(outDir, `${baseName}-xhs-${i + 1}.png`);
      fs.writeFileSync(outPath, Buffer.from(images[i].data, 'base64'));
      console.log(`卡片 ${i + 1}/${images.length}: ${outPath}`);
    }
    console.log(`小红书系列图生成完成: ${images.length} 张`);
  });

// Scrape subcommand
program
  .command('scrape <url>')
  .description('URL→Markdown 抓取：提取网页正文并转换为 Markdown')
  .option('-o, --output <path>', '输出 Markdown 文件路径')
  .option('--wait', '手动交互模式 (等待用户登录/关闭弹窗后按 Enter)')
  .action(async (url, options) => {
    const { scrape } = require('./scraper');
    try {
      const result = await scrape(url, { wait: options.wait });
      if (options.output) {
        const outPath = path.resolve(options.output);
        fs.writeFileSync(outPath, result.content, 'utf-8');
        console.log(`已保存: ${outPath}`);
      } else {
        process.stdout.write(result.content + '\n');
      }
    } catch (err) {
      console.error(`抓取失败: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
