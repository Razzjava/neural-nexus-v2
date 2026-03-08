#!/usr/bin/env node

/**
 * Workforce Reporter Agent
 * 
 * Generates interactive HTML reports summarizing all team activities.
 * Runs every 4 hours, creates beautiful dashboard with:
 * - Team status summaries
 * - Recent completions
 * - Active projects
 * - Health metrics
 * - Trends and insights
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const WORKFORCE_DIR = path.join(NEXUS_DIR, 'workforce');
const REPORTS_DIR = path.join(WORKFORCE_DIR, 'reports');

// Ensure directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

class WorkforceReporter {
  constructor() {
    this.teams = ['startup-generation', 'nexus-development', 'social-media'];
    this.reportId = `report-${Date.now()}`;
  }

  /**
   * Generate complete workforce report
   */
  async generateReport() {
    console.log('[WorkforceReporter] Generating report...');
    
    const data = await this.collectData();
    const html = this.generateHTML(data);
    
    // Save HTML report
    const reportPath = path.join(REPORTS_DIR, 'workforce-dashboard.html');
    fs.writeFileSync(reportPath, html);
    
    // Also save with timestamp for history
    const historyPath = path.join(REPORTS_DIR, `workforce-report-${new Date().toISOString().split('T')[0]}.html`);
    fs.writeFileSync(historyPath, html);
    
    console.log(`[WorkforceReporter] Report saved: ${reportPath}`);
    
    // Send notification with file
    await this.sendNotification(reportPath, data);
    
    return reportPath;
  }

  /**
   * Collect data from all teams
   */
  async collectData() {
    const data = {
      timestamp: new Date().toISOString(),
      summary: {},
      teams: {},
      trends: {},
      alerts: []
    };

    // Collect from each team
    for (const team of this.teams) {
      data.teams[team] = await this.collectTeamData(team);
    }

    // Calculate summary
    data.summary = this.calculateSummary(data.teams);
    
    // Identify trends
    data.trends = this.identifyTrends(data.teams);
    
    // Generate alerts
    data.alerts = this.generateAlerts(data.teams);

    return data;
  }

  /**
   * Collect data for a specific team
   */
  async collectTeamData(teamName) {
    const teamData = {
      name: teamName,
      status: 'unknown',
      lastActivity: null,
      recentCompletions: [],
      activeProjects: [],
      health: 1.0,
      metrics: {}
    };

    try {
      switch(teamName) {
        case 'startup-generation':
          return this.collectStartupData(teamData);
        case 'nexus-development':
          return this.collectDevData(teamData);
        case 'social-media':
          return this.collectSocialData(teamData);
      }
    } catch (error) {
      teamData.status = 'error';
      teamData.error = error.message;
      return teamData;
    }

    return teamData;
  }

  collectStartupData(teamData) {
    const startupsDir = path.join(WORKFORCE_DIR, 'projects/startups');
    
    if (!fs.existsSync(startupsDir)) {
      teamData.status = 'idle';
      return teamData;
    }

    const startups = fs.readdirSync(startupsDir)
      .filter(dir => fs.statSync(path.join(startupsDir, dir)).isDirectory())
      .map(dir => {
        const dirPath = path.join(startupsDir, dir);
        const stat = fs.statSync(dirPath);
        const startupFile = path.join(dirPath, 'STARTUP.md');
        
        let phases = [];
        if (fs.existsSync(startupFile)) {
          const content = fs.readFileSync(startupFile, 'utf8');
          const match = content.match(/Phases Completed\n+([\s\S]*?)(?=\n##|$)/);
          if (match) {
            phases = match[1].split('\n').filter(l => l.trim().startsWith('-')).length;
          }
        }

        return {
          id: dir,
          created: stat.mtime,
          phasesCompleted: phases
        };
      })
      .sort((a, b) => b.created - a.created);

    const recent = startups.slice(0, 5);
    const last4Hours = Date.now() - (4 * 60 * 60 * 1000);
    
    teamData.recentCompletions = recent.filter(s => s.created.getTime() > last4Hours);
    teamData.activeProjects = startups.filter(s => s.phasesCompleted < 5);
    teamData.status = teamData.activeProjects.length > 0 ? 'active' : 'idle';
    teamData.metrics = {
      totalStartups: startups.length,
      completed: startups.filter(s => s.phasesCompleted >= 5).length,
      inProgress: teamData.activeProjects.length
    };

    if (recent.length > 0) {
      teamData.lastActivity = recent[0].created.toISOString();
    }

    return teamData;
  }

  collectDevData(teamData) {
    const sprintsDir = path.join(WORKFORCE_DIR, 'projects/nexus-dev/sprints');
    const releasesDir = path.join(WORKFORCE_DIR, 'projects/nexus-dev/releases');
    const backlogFile = path.join(WORKFORCE_DIR, 'projects/nexus-dev/backlog.json');

    // Get sprints
    let sprints = [];
    if (fs.existsSync(sprintsDir)) {
      sprints = fs.readdirSync(sprintsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(fs.readFileSync(path.join(sprintsDir, f), 'utf8')))
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }

    // Get releases
    let releases = [];
    if (fs.existsSync(releasesDir)) {
      releases = fs.readdirSync(releasesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          ...JSON.parse(fs.readFileSync(path.join(releasesDir, f), 'utf8')),
          filename: f
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Get backlog
    let backlog = { stories: [] };
    if (fs.existsSync(backlogFile)) {
      backlog = JSON.parse(fs.readFileSync(backlogFile, 'utf8'));
    }

    const last4Hours = Date.now() - (4 * 60 * 60 * 1000);
    const recentSprints = sprints.filter(s => new Date(s.startDate).getTime() > last4Hours);

    teamData.recentCompletions = recentSprints.map(s => ({
      id: s.id,
      stories: s.stories?.filter(st => st.status === 'done').length || 0,
      velocity: s.completedPoints || 0
    }));

    teamData.activeProjects = sprints
      .filter(s => s.status === 'active')
      .map(s => ({
        id: s.id,
        stories: s.stories?.length || 0,
        progress: s.completedPoints / s.plannedPoints
      }));

    teamData.status = teamData.activeProjects.length > 0 ? 'active' : 'planning';
    
    const latestSprint = sprints[0];
    if (latestSprint) {
      teamData.lastActivity = latestSprint.startDate;
      teamData.health = latestSprint.completedPoints >= latestSprint.plannedPoints * 0.7 ? 1.0 : 0.7;
    }

    teamData.metrics = {
      totalSprints: sprints.length,
      totalReleases: releases.length,
      backlogSize: backlog.stories.length,
      latestVersion: releases[0]?.version || '2.0.0',
      avgVelocity: sprints.slice(0, 3).reduce((sum, s) => sum + (s.completedPoints || 0), 0) / Math.min(sprints.length, 3) || 0
    };

    return teamData;
  }

  collectSocialData(teamData) {
    const queueDir = path.join(WORKFORCE_DIR, 'projects/content-empire/queue');
    const publishedDir = path.join(WORKFORCE_DIR, 'projects/content-empire/published');

    let queue = [];
    if (fs.existsSync(queueDir)) {
      queue = fs.readdirSync(queueDir)
        .filter(dir => fs.statSync(path.join(queueDir, dir)).isDirectory())
        .map(dir => {
          const packageFile = path.join(queueDir, dir, 'package.json');
          let data = { id: dir, scheduled: false };
          if (fs.existsSync(packageFile)) {
            data = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
          }
          return data;
        });
    }

    let published = [];
    if (fs.existsSync(publishedDir)) {
      published = fs.readdirSync(publishedDir)
        .filter(dir => fs.statSync(path.join(publishedDir, dir)).isDirectory())
        .map(dir => ({ id: dir, published: true }));
    }

    const last4Hours = Date.now() - (4 * 60 * 60 * 1000);
    const recentlyCreated = queue.filter(q => {
      const created = new Date(q.createdAt || 0).getTime();
      return created > last4Hours;
    });

    teamData.recentCompletions = recentlyCreated.map(c => ({
      id: c.id,
      theme: c.scripts?.youtubeShort?.theme || 'unknown',
      hook: c.scripts?.youtubeShort?.hook || 'N/A'
    }));

    teamData.activeProjects = queue
      .filter(q => !q.scheduled)
      .slice(0, 5)
      .map(q => ({
        id: q.id,
        status: q.videos?.youtubeShort?.status || 'pending'
      }));

    teamData.status = teamData.activeProjects.length > 0 ? 'active' : 'idle';
    
    if (queue.length > 0) {
      const latest = queue.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )[0];
      teamData.lastActivity = latest.createdAt;
    }

    teamData.metrics = {
      queueDepth: queue.length,
      scheduled: queue.filter(q => q.scheduled).length,
      published: published.length,
      readyToSchedule: queue.filter(q => !q.scheduled).length
    };

    return teamData;
  }

  calculateSummary(teams) {
    const totalActive = Object.values(teams).filter(t => t.status === 'active').length;
    const totalProjects = Object.values(teams).reduce((sum, t) => sum + (t.activeProjects?.length || 0), 0);
    const recentWork = Object.values(teams).reduce((sum, t) => sum + (t.recentCompletions?.length || 0), 0);
    const avgHealth = Object.values(teams).reduce((sum, t) => sum + (t.health || 1), 0) / Object.keys(teams).length;

    return {
      activeTeams: totalActive,
      totalProjects,
      recentWork,
      overallHealth: avgHealth,
      lastUpdated: new Date().toISOString()
    };
  }

  identifyTrends(teams) {
    return {
      mostActive: Object.entries(teams)
        .sort((a, b) => (b[1].recentCompletions?.length || 0) - (a[1].recentCompletions?.length || 0))[0]?.[0],
      needsAttention: Object.entries(teams)
        .filter(([_, t]) => (t.health || 1) < 0.8)
        .map(([name]) => name)
    };
  }

  generateAlerts(teams) {
    const alerts = [];

    for (const [name, team] of Object.entries(teams)) {
      if (team.status === 'error') {
        alerts.push({
          severity: 'high',
          team: name,
          message: `Team experiencing errors: ${team.error}`
        });
      }

      if (team.health < 0.7) {
        alerts.push({
          severity: 'medium',
          team: name,
          message: `${name} health below 70%`
        });
      }

      if (team.metrics?.backlogSize > 20) {
        alerts.push({
          severity: 'low',
          team: name,
          message: `${name} backlog exceeds 20 items`
        });
      }
    }

    return alerts;
  }

  /**
   * Generate interactive HTML report
   */
  generateHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neural Nexus Workforce Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            color: #eaeaea;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            padding: 40px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 40px;
        }
        
        h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #e94560, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        
        .timestamp {
            color: #888;
            font-size: 0.9rem;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .summary-card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 24px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .summary-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 40px rgba(233, 69, 96, 0.2);
        }
        
        .summary-card h3 {
            font-size: 0.9rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .summary-card .value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #e94560;
        }
        
        .teams-section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.5rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #e94560;
            border-radius: 2px;
        }
        
        .team-card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .team-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .team-name {
            font-size: 1.3rem;
            font-weight: 600;
        }
        
        .team-status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-active {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
        }
        
        .status-idle {
            background: rgba(241, 196, 15, 0.2);
            color: #f1c40f;
        }
        
        .status-error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric {
            background: rgba(255,255,255,0.03);
            padding: 15px;
            border-radius: 10px;
        }
        
        .metric-label {
            font-size: 0.75rem;
            color: #888;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 1.3rem;
            font-weight: 600;
        }
        
        .activity-section {
            margin-top: 20px;
        }
        
        .activity-title {
            font-size: 0.9rem;
            color: #888;
            margin-bottom: 10px;
        }
        
        .activity-list {
            list-style: none;
        }
        
        .activity-item {
            background: rgba(255,255,255,0.03);
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 3px solid #e94560;
            font-size: 0.9rem;
        }
        
        .alerts-section {
            margin-bottom: 40px;
        }
        
        .alert {
            background: rgba(231, 76, 60, 0.1);
            border: 1px solid rgba(231, 76, 60, 0.3);
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .alert-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        .alert-high .alert-icon {
            background: #e74c3c;
        }
        
        .alert-medium .alert-icon {
            background: #f39c12;
        }
        
        .alert-low .alert-icon {
            background: #3498db;
        }
        
        .trends-section {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 24px;
        }
        
        .trend-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .trend-item:last-child {
            border-bottom: none;
        }
        
        .refresh-info {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.85rem;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .live-indicator {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #2ecc71;
            font-size: 0.85rem;
        }
        
        .live-indicator::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #2ecc71;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧠 Neural Nexus Workforce</h1>
            <p class="timestamp">Generated: ${new Date(data.timestamp).toLocaleString()}</p>
            <p class="live-indicator">System Operational</p>
        </header>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Active Teams</h3>
                <div class="value">${data.summary.activeTeams}/3</div>
            </div>
            <div class="summary-card">
                <h3>Active Projects</h3>
                <div class="value">${data.summary.totalProjects}</div>
            </div>
            <div class="summary-card">
                <h3>Recent Completions</h3>
                <div class="value">${data.summary.recentWork}</div>
            </div>
            <div class="summary-card">
                <h3>Overall Health</h3>
                <div class="value">${(data.summary.overallHealth * 100).toFixed(0)}%</div>
            </div>
        </div>

        ${data.alerts.length > 0 ? `
        <div class="alerts-section">
            <h2 class="section-title">⚠️ Alerts</h2>
            ${data.alerts.map(alert => `
            <div class="alert alert-${alert.severity}">
                <div class="alert-icon">!</div>
                <div>
                    <strong>${alert.team}</strong>: ${alert.message}
                </div>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="teams-section">
            <h2 class="section-title">👥 Team Status</h2>
            ${Object.values(data.teams).map(team => this.generateTeamHTML(team)).join('')}
        </div>

        <div class="trends-section">
            <h2 class="section-title">📊 Insights</h2>
            <div class="trend-item">
                <span>Most Active Team</span>
                <strong style="color: #e94560;">${data.trends.mostActive || 'N/A'}</strong>
            </div>
            <div class="trend-item">
                <span>Teams Needing Attention</span>
                <strong>${data.trends.needsAttention.length > 0 ? data.trends.needsAttention.join(', ') : 'None'}</strong>
            </div>
            <div class="trend-item">
                <span>Total Teams Monitored</span>
                <strong>${Object.keys(data.teams).length}</strong>
            </div>
            <div class="trend-item">
                <span>Report Generated</span>
                <strong>${new Date(data.timestamp).toLocaleTimeString()}</strong>
            </div>
        </div>

        <div class="refresh-info">
            <p>Next report in ~4 hours • Auto-refreshes every 4 hours</p>
            <p>Neural Nexus Autonomous Workforce v2.0</p>
        </div>
    </div>

    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => {
            window.location.reload();
        }, 300000);

        // Add interactive hover effects
        document.querySelectorAll('.team-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'scale(1.02)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'scale(1)';
            });
        });
    </script>
</body>
</html>`;
  }

  generateTeamHTML(team) {
    const statusClass = `status-${team.status}`;
    const lastActivity = team.lastActivity 
      ? new Date(team.lastActivity).toLocaleString() 
      : 'No recent activity';

    return `
    <div class="team-card">
        <div class="team-header">
            <div class="team-name">${this.formatTeamName(team.name)}</div>
            <div class="team-status ${statusClass}">${team.status}</div>
        </div>
        
        <div class="metrics-grid">
            ${Object.entries(team.metrics || {}).map(([key, value]) => `
            <div class="metric">
                <div class="metric-label">${this.formatMetricLabel(key)}</div>
                <div class="metric-value">${value}</div>
            </div>
            `).join('')}
        </div>

        ${team.recentCompletions?.length > 0 ? `
        <div class="activity-section">
            <div class="activity-title">Recent Activity (${team.recentCompletions.length})</div>
            <ul class="activity-list">
                ${team.recentCompletions.slice(0, 3).map(c => `
                <li class="activity-item">
                    ${c.id || c.title || 'Completed task'}
                </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        <div style="margin-top: 15px; font-size: 0.8rem; color: #666;">
            Last activity: ${lastActivity}
        </div>
    </div>
    `;
  }

  formatTeamName(name) {
    return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  formatMetricLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  async sendNotification(reportPath, data) {
    try {
      const summary = `📊 Workforce Report Updated\n\n` +
        `Active Teams: ${data.summary.activeTeams}/3\n` +
        `Projects: ${data.summary.totalProjects}\n` +
        `Recent Work: ${data.summary.recentWork}\n` +
        `Health: ${(data.summary.overallHealth * 100).toFixed(0)}%\n\n` +
        `📄 Report: ${reportPath}\n\n` +
        `(HTML file - open in browser to view interactive dashboard)`;

      execSync(`openclaw message send --target "-5297940191" --message "${summary}"`, {
        timeout: 10000
      });

      console.log('[WorkforceReporter] Notification sent');
    } catch (e) {
      console.error('[WorkforceReporter] Failed to notify:', e.message);
    }
  }
}

// Export
const reporter = new WorkforceReporter();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'generate':
      reporter.generateReport().then(path => {
        console.log('Report generated:', path);
      });
      break;
    default:
      console.log('Usage: node workforce-reporter.js [generate]');
  }
}

module.exports = reporter;
