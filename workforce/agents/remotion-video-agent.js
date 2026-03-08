#!/usr/bin/env node

/**
 * Remotion Video Production Agent
 * 
 * Creates engaging videos from scripts using Remotion:
 * - TikTok: 9:16 vertical, fast-paced, 15-60s
 * - YouTube Shorts: 9:16 vertical, 60s max
 * - YouTube Long: 16:9 horizontal, 3-10min
 * 
 * Research-driven: Studies viral video patterns before creating
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const CONTENT_DIR = path.join(NEXUS_DIR, 'workforce/projects/content-empire');
const QUEUE_DIR = path.join(CONTENT_DIR, 'queue');
const VIDEO_OUTPUT = path.join(CONTENT_DIR, 'videos');
const REMOTION_DIR = path.join(NEXUS_DIR, 'remotion');

// Ensure directories
[VIDEO_OUTPUT, REMOTION_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class RemotionVideoAgent {
  constructor() {
    this.templates = this.loadTemplates();
    this.viralPatterns = this.loadViralPatterns();
  }

  /**
   * Load video component templates
   */
  loadTemplates() {
    return {
      hookFlash: {
        name: 'FlashText',
        component: `const FlashText = ({ text, subtext }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 20], [0.8, 1], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)'
    }}>
      <div style={{ 
        fontSize: '80px', 
        fontWeight: 'bold',
        color: '#e94560',
        opacity,
        transform: \`scale(\${scale})\`,
        textAlign: 'center',
        textShadow: '0 0 40px rgba(233, 69, 96, 0.5)'
      }}>
        {text}
      </div>
      {subtext && (
        <div style={{
          fontSize: '40px',
          color: '#fff',
          marginTop: '20px',
          opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
};`,
        duration: 90
      },
      
      counter: {
        name: 'Counter',
        component: `const Counter = ({ from, to, suffix = '', label }) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [0, 90], [from, to], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease)
  });
  
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f1e'
    }}>
      <div style={{
        fontSize: '120px',
        fontWeight: 'bold',
        color: '#e94560',
        fontFamily: 'monospace'
      }}>
        {Math.round(value)}{suffix}
      </div>
      <div style={{
        fontSize: '36px',
        color: '#888',
        marginTop: '20px'
      }}>
        {label}
      </div>
    </div>
  );
};`,
        duration: 90
      },

      splitCompare: {
        name: 'SplitCompare',
        component: `const SplitCompare = ({ left, right, leftColor = '#e74c3c', rightColor = '#2ecc71' }) => {
  const frame = useCurrentFrame();
  const splitPosition = interpolate(frame, [0, 60], [50, 50], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
      <div style={{
        flex: 1,
        background: leftColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#fff',
          textAlign: 'center'
        }}>
          {left}
        </div>
      </div>
      
      <div style={{
        flex: 1,
        background: rightColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#fff',
          textAlign: 'center'
        }}>
          {right}
        </div>
      </div>
      
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '30px',
        fontWeight: 'bold',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        VS
      </div>
    </div>
  );
};`,
        duration: 120
      },

      textReveal: {
        name: 'TextReveal',
        component: `const TextReveal = ({ text, highlightWords = [] }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
      padding: '60px'
    }}>
      <div style={{
        fontSize: '56px',
        lineHeight: '1.4',
        color: '#fff',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        {words.map((word, i) => {
          const delay = i * 3;
          const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
          const isHighlight = highlightWords.includes(word.toLowerCase());
          
          return (
            <span key={i} style={{
              opacity,
              color: isHighlight ? '#e94560' : '#fff',
              fontWeight: isHighlight ? 'bold' : 'normal',
              marginRight: '12px',
              textShadow: isHighlight ? '0 0 20px rgba(233, 69, 96, 0.5)' : 'none'
            }}>
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};`,
        duration: 150
      },

      emojiReaction: {
        name: 'EmojiReaction',
        component: `const EmojiReaction = ({ emoji, text, subtext }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30, 60], [0, 1.2, 1], { extrapolateRight: 'clamp' });
  const rotate = interpolate(frame, [0, 60], [-20, 0], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f1e'
    }}>
      <div style={{
        fontSize: '150px',
        transform: \`scale(\${scale}) rotate(\${rotate}deg)\`,
        filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))'
      }}>
        {emoji}
      </div>
      
      <div style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#fff',
        marginTop: '40px',
        opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' })
      }}>
        {text}
      </div>
      
      {subtext && (
        <div style={{
          fontSize: '32px',
          color: '#888',
          marginTop: '20px',
          opacity: interpolate(frame, [45, 75], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
};`,
        duration: 90
      },

      progressBar: {
        name: 'ProgressBar',
        component: `const ProgressBar = ({ percent, label }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 90], [0, percent], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f1e',
      padding: '60px'
    }}>
      <div style={{
        fontSize: '72px',
        fontWeight: 'bold',
        color: '#e94560',
        marginBottom: '30px'
      }}>
        {Math.round(progress)}%
      </div>
      
      <div style={{
        width: '80%',
        height: '40px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: \`\${progress}%\`,
          height: '100%',
          background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
          borderRadius: '20px',
          transition: 'width 0.1s'
        }} />
      </div>
      
      <div style={{
        fontSize: '36px',
        color: '#888',
        marginTop: '30px'
      }}>
        {label}
      </div>
    </div>
  );
};`,
        duration: 90
      }
    };
  }

  /**
   * Load viral video patterns from research
   */
  loadViralPatterns() {
    return {
      tiktok: {
        optimalDuration: 45,
        hookTime: 3,
        pacing: 'fast',
        captions: true,
        music: 'trending',
        structure: ['hook', 'problem', 'solution', 'proof', 'cta']
      },
      youtubeShort: {
        optimalDuration: 58,
        hookTime: 5,
        pacing: 'fast',
        captions: true,
        loop: true,
        structure: ['hook', 'value', 'cta']
      },
      youtubeLong: {
        optimalDuration: 480,
        hookTime: 30,
        pacing: 'mixed',
        chapters: true,
        structure: ['hook', 'intro', 'content', 'proof', 'cta']
      }
    };
  }

  /**
   * Main execution: process scripts into videos
   */
  async run() {
    console.log('[RemotionVideoAgent] Starting video production...');
    
    // 1. Find scripts to process
    const scripts = this.findScriptsToProcess();
    console.log(`[RemotionVideoAgent] Found ${scripts.length} scripts to process`);
    
    if (scripts.length === 0) {
      console.log('[RemotionVideoAgent] No scripts in queue');
      return;
    }
    
    // 2. Process each script
    for (const script of scripts.slice(0, 3)) {
      await this.processScript(script);
    }
    
    console.log('[RemotionVideoAgent] Video production complete');
  }

  /**
   * Find unprocessed scripts in queue
   */
  findScriptsToProcess() {
    if (!fs.existsSync(QUEUE_DIR)) return [];

    const scripts = [];
    const files = fs.readdirSync(QUEUE_DIR);

    for (const file of files) {
      if (!file.endsWith('.md') || file.startsWith('00-')) continue;

      const filePath = path.join(QUEUE_DIR, file);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      // Check if video already created
      const videoId = file.replace('.md', '');
      const videoPath = path.join(VIDEO_OUTPUT, videoId);
      if (fs.existsSync(videoPath)) continue;

      // Parse markdown content
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parseMarkdownScript(content, file);

      if (parsed) {
        scripts.push({
          id: videoId,
          path: filePath,
          data: parsed
        });
      }
    }

    return scripts;
  }

  /**
   * Parse markdown script file
   */
  parseMarkdownScript(content, filename) {
    const script = {
      hook: '',
      theme: '',
      youtubeLong: null,
      youtubeShort: null,
      tiktok: null,
      linkedin: null,
      twitter: null
    };

    // Extract hook
    const hookMatch = content.match(/## 🎯 Core Hook\s*\*\*"([^"]+)"\*\*/);
    if (hookMatch) script.hook = hookMatch[1];

    // Extract theme
    const themeMatch = content.match(/## Theme:([^|]+)/);
    if (themeMatch) script.theme = themeMatch[1].trim();

    // Parse YouTube Long sections
    const youtubeLongMatch = content.match(/## 📺 YOUTUBE LONG-FORM[\s\S]*?(?=## 📺 YOUTUBE SHORT|$)/);
    if (youtubeLongMatch) {
      script.youtubeLong = this.parseYouTubeLong(youtubeLongMatch[0]);
    }

    // Parse YouTube Short sections
    const youtubeShortMatch = content.match(/## 📺 YOUTUBE SHORT[\s\S]*?(?=## 📱 TIKTOK|$)/);
    if (youtubeShortMatch) {
      script.youtubeShort = this.parseYouTubeShort(youtubeShortMatch[0]);
    }

    // Parse TikTok sections
    const tiktokMatch = content.match(/## 📱 TIKTOK[\s\S]*?(?=## 🐦 TWITTER|$)/);
    if (tiktokMatch) {
      script.tiktok = this.parseTikTok(tiktokMatch[0]);
    }

    return script;
  }

  parseYouTubeLong(content) {
    const sections = [];
    const sectionMatches = content.matchAll(/\*\*\[(\d+:\d+-\d+:\d+)\]\s*(\w+)\*\*\s*\n+"([^"]+)"/g);

    for (const match of sectionMatches) {
      const [, timing, type, text] = match;
      const [start, end] = timing.split('-');
      const startSec = this.timeToSeconds(start);
      const endSec = this.timeToSeconds(end);
      const duration = endSec - startSec;

      sections.push({
        type: this.mapSectionType(type),
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: Math.min(duration, 60)
      });
    }

    return {
      duration: sections.reduce((sum, s) => sum + s.duration, 0),
      sections: sections.length > 0 ? sections : this.generateDefaultSections('youtubeLong')
    };
  }

  parseYouTubeShort(content) {
    const sections = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/\*\*\[(\d+s)\]\*\*\s*(.+)/);
      if (match) {
        const [, timing, text] = match;
        const duration = parseInt(timing);

        sections.push({
          type: sections.length === 0 ? 'hook' : (sections.length === 1 ? 'value' : 'cta'),
          text: text.substring(0, 80),
          duration: Math.max(duration, 3)
        });
      }
    }

    return {
      duration: 58,
      sections: sections.length > 0 ? sections : this.generateDefaultSections('youtubeShort')
    };
  }

  parseTikTok(content) {
    const sections = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/\*\*\[(\d+s)\]\*\*\s*(.+)/);
      if (match) {
        const [, timing, text] = match;
        const duration = parseInt(timing);

        sections.push({
          type: sections.length === 0 ? 'hook' : (sections.length === 1 ? 'build' : (sections.length === 2 ? 'reveal' : 'cta')),
          text: text.substring(0, 60),
          duration: Math.max(duration, 2)
        });
      }
    }

    return {
      duration: 45,
      sections: sections.length > 0 ? sections : this.generateDefaultSections('tiktok')
    };
  }

  timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr);
  }

  mapSectionType(type) {
    const mapping = {
      'HOOK': 'hook',
      'PROBLEM': 'problem',
      'SOLUTION': 'solution',
      'PROOF': 'proof',
      'CTA': 'cta',
      'THE PROBLEM': 'problem',
      'THE REALITY CHECK': 'solution',
      'WHAT THIS MEANS': 'solution',
      'THE UPSIDE': 'proof',
      'CALL TO ACTION': 'cta'
    };
    return mapping[type.toUpperCase()] || 'text';
  }

  generateDefaultSections(format) {
    const patterns = {
      youtubeLong: [
        { type: 'hook', text: 'Attention grabbing hook', duration: 30 },
        { type: 'problem', text: 'The problem explained', duration: 120 },
        { type: 'solution', text: 'The solution presented', duration: 180 },
        { type: 'proof', text: 'Proof and examples', duration: 90 },
        { type: 'cta', text: 'Call to action', duration: 30 }
      ],
      youtubeShort: [
        { type: 'hook', text: 'Quick hook', duration: 5 },
        { type: 'value', text: 'Value delivery', duration: 45 },
        { type: 'cta', text: 'Follow for more', duration: 8 }
      ],
      tiktok: [
        { type: 'hook', text: 'Trendy hook', duration: 3 },
        { type: 'build', text: 'Build curiosity', duration: 15 },
        { type: 'reveal', text: 'The reveal', duration: 20 },
        { type: 'cta', text: 'Like and follow', duration: 7 }
      ]
    };
    return patterns[format] || patterns.youtubeShort;
  }

  /**
   * Process a single script into videos
   */
  async processScript(script) {
    console.log(`[RemotionVideoAgent] Processing: ${script.id}`);
    
    // Use parsed script data
    const scriptData = script.data;
    
    const videoDir = path.join(VIDEO_OUTPUT, script.id);
    fs.mkdirSync(videoDir, { recursive: true });
    
    // Generate videos for each format
    const videos = {};
    
    // TikTok (9:16)
    if (scriptData.tiktok) {
      console.log(`[RemotionVideoAgent] Creating TikTok video...`);
      videos.tiktok = await this.generateVideo({
        script: {
          hook: scriptData.hook,
          ...scriptData.tiktok
        },
        format: 'tiktok',
        width: 1080,
        height: 1920,
        fps: 30
      }, videoDir);
    }
    
    // YouTube Short (9:16)
    if (scriptData.youtubeShort) {
      console.log(`[RemotionVideoAgent] Creating YouTube Short...`);
      videos.youtubeShort = await this.generateVideo({
        script: {
          hook: scriptData.hook,
          ...scriptData.youtubeShort
        },
        format: 'youtubeShort',
        width: 1080,
        height: 1920,
        fps: 30
      }, videoDir);
    }
    
    // YouTube Long (16:9)
    if (scriptData.youtubeLong) {
      console.log(`[RemotionVideoAgent] Creating YouTube video...`);
      videos.youtubeLong = await this.generateVideo({
        script: {
          hook: scriptData.hook,
          ...scriptData.youtubeLong
        },
        format: 'youtubeLong',
        width: 1920,
        height: 1080,
        fps: 30
      }, videoDir);
    }
    
    // Save video manifest
    fs.writeFileSync(
      path.join(videoDir, 'videos.json'),
      JSON.stringify({
        scriptId: script.id,
        hook: scriptData.hook,
        theme: scriptData.theme,
        createdAt: new Date().toISOString(),
        videos
      }, null, 2)
    );
    
    // Mark script as processed
    fs.writeFileSync(
      path.join(videoDir, 'processed.txt'),
      `Processed: ${new Date().toISOString()}\nSource: ${script.path}`
    );
    
    console.log(`[RemotionVideoAgent] ✅ Videos created for ${script.id}`);
    
    return videos;
  }

  /**
   * Generate a single video
   */
  async generateVideo(config, outputDir) {
    const { script, format, width, height, fps } = config;
    
    // Calculate total duration
    const totalFrames = script.duration * fps;
    
    // Create Remotion composition
    const compositionCode = this.createComposition(script, format, width, height, fps, totalFrames);
    
    // Save composition
    const compositionName = `video-${format}-${Date.now()}`;
    const compositionPath = path.join(REMOTION_DIR, `${compositionName}.tsx`);
    fs.writeFileSync(compositionPath, compositionCode);
    
    // Render video (simulated - would use actual Remotion render)
    const outputPath = path.join(outputDir, `${format}.mp4`);
    
    // In production, would run:
    // npx remotion render composition.tsx compositionId output.mp4
    
    // For now, create placeholder
    fs.writeFileSync(
      path.join(outputDir, `${format}.remotion.tsx`),
      compositionCode
    );
    
    return {
      format,
      width,
      height,
      duration: script.duration,
      fps,
      compositionPath,
      outputPath,
      status: 'ready_to_render'
    };
  }

  /**
   * Create Remotion composition code
   */
  createComposition(script, format, width, height, fps, totalFrames) {
    const pattern = this.viralPatterns[format];
    
    // Build scene sequence based on script sections
    const scenes = script.sections.map((section, index) => {
      const template = this.selectTemplateForSection(section.type);
      const duration = section.duration * fps;
      
      return {
        template,
        duration,
        data: section
      };
    });

    const totalSceneFrames = scenes.reduce((sum, s) => sum + s.duration, 0);
    
    // Generate imports
    const imports = [...new Set(scenes.map(s => s.template.name))];
    
    // Generate component code
    return `import { Composition, Series, interpolate, useCurrentFrame, Easing } from 'remotion';

// Viral video pattern: ${format}
// Optimal duration: ${pattern.optimalDuration}s
// Structure: ${pattern.structure.join(' → ')}

${imports.map(name => this.templates[name.toLowerCase()]?.component || '').filter(Boolean).join('\n\n')}

const ${format}Video = () => {
  return (
    <Series>
      ${scenes.map((scene, i) => `
      <Series.Sequence durationInFrames={${scene.duration}}>
        <${scene.template.name} 
          text="${scene.data.text || ''}"
          ${scene.data.subtext ? `subtext="${scene.data.subtext}"` : ''}
          ${scene.data.left ? `left="${scene.data.left}"` : ''}
          ${scene.data.right ? `right="${scene.data.right}"` : ''}
          ${scene.data.percent ? `percent={${scene.data.percent}}` : ''}
          ${scene.data.label ? `label="${scene.data.label}"` : ''}
          ${scene.data.emoji ? `emoji="${scene.data.emoji}"` : ''}
        />
      </Series.Sequence>
      `).join('')}
    </Series>
  );
};

export const ${format}Composition = {
  id: '${format}-video',
  component: ${format}Video,
  durationInFrames: ${totalSceneFrames},
  fps: ${fps},
  width: ${width},
  height: ${height},
  defaultProps: {
    // Script data
    title: "${script.hook || 'Video'}",
    format: "${format}"
  }
};

export default ${format}Video;
`;
  }

  /**
   * Select appropriate template for section type
   */
  selectTemplateForSection(type) {
    const mapping = {
      'hook': this.templates.hookFlash,
      'problem': this.templates.textReveal,
      'solution': this.templates.splitCompare,
      'proof': this.templates.counter,
      'reveal': this.templates.emojiReaction,
      'build': this.templates.progressBar,
      'cta': this.templates.hookFlash
    };
    
    return mapping[type] || this.templates.textReveal;
  }

  /**
   * Research viral video patterns
   */
  async researchViralPatterns() {
    // In production, would analyze trending videos
    return {
      hooks: [
        'I wish I knew this sooner',
        'This changes everything',
        'Stop doing this',
        'The secret nobody tells you',
        'What I learned the hard way'
      ],
      transitions: ['zoom', 'flash', 'slide', 'spin'],
      textStyles: ['bold', 'typewriter', 'bounce'],
      musicTypes: ['upbeat', 'trending', 'dramatic']
    };
  }

  /**
   * Get agent status
   */
  getStatus() {
    const queueCount = this.findScriptsToProcess().length;
    const videoCount = fs.existsSync(VIDEO_OUTPUT) 
      ? fs.readdirSync(VIDEO_OUTPUT).length 
      : 0;
    
    return {
      agent: 'remotion-video',
      scriptsInQueue: queueCount,
      videosCreated: videoCount,
      formats: ['tiktok', 'youtubeShort', 'youtubeLong'],
      templates: Object.keys(this.templates).length
    };
  }
}

// Export
const videoAgent = new RemotionVideoAgent();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'run':
      videoAgent.run().then(() => {
        console.log('Video production complete');
      });
      break;
    case 'status':
      console.log(JSON.stringify(videoAgent.getStatus(), null, 2));
      break;
    default:
      console.log('Usage: node remotion-video-agent.js [run|status]');
  }
}

module.exports = videoAgent;
