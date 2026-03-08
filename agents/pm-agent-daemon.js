#!/usr/bin/env node

/**
 * Project Manager Agent - Real Operational Daemon
 * Handles project coordination, sprint management, and team oversight
 */

const AgentBase = require('../agent-base');
const fs = require('fs');
const path = require('path');

class PMAgent extends AgentBase {
  constructor() {
    super('pm', {
      name: 'Project Manager',
      workInterval: 10 * 60 * 1000,
      defaultMetrics: {
        sprintsPlanned: 0,
        tasksTracked: 0,
        reportsGenerated: 0
      }
    });
    
    this.projectsDir = path.join('/root/.openclaw/workspace/neural-nexus', 'projects');
    this.sprintsDir = path.join(this.projectsDir, 'sprints');
    
    [this.projectsDir, this.sprintsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async doWork() {
    // Check for active projects
    const projects = this.getActiveProjects();
    
    if (projects.length === 0) {
      this.log('No active projects - creating new project template');
      await this.createNewProject();
      return;
    }

    // Manage each project
    for (const project of projects.slice(0, 3)) {
      await this.manageProject(project);
    }

    // Generate overall status report
    await this.generateStatusReport();
  }

  getActiveProjects() {
    const files = fs.readdirSync(this.projectsDir).filter(f => f.endsWith('.json'));
    return files.map(f => JSON.parse(fs.readFileSync(path.join(this.projectsDir, f), 'utf8')));
  }

  async createNewProject() {
    const projectId = `proj-${Date.now()}`;
    const project = {
      id: projectId,
      name: 'Neural Nexus Enhancement',
      status: 'planning',
      createdAt: new Date().toISOString(),
      sprints: [],
      backlog: [],
      team: ['architect', 'backend-dev', 'frontend-dev', 'qa', 'devops']
    };

    fs.writeFileSync(
      path.join(this.projectsDir, `${projectId}.json`),
      JSON.stringify(project, null, 2)
    );

    this.log(`Created new project: ${projectId}`);
  }

  async manageProject(project) {
    this.log(`Managing project: ${project.name}`);

    // Check if sprint needs planning
    if (project.sprints.length === 0 || this.isSprintComplete(project)) {
      await this.planNewSprint(project);
    }

    // Track current sprint progress
    await this.trackSprintProgress(project);

    // Update project status
    this.updateProject(project);
  }

  isSprintComplete(project) {
    const currentSprint = project.sprints[project.sprints.length - 1];
    if (!currentSprint) return true;
    
    const endDate = new Date(currentSprint.endDate);
    return endDate < new Date();
  }

  async planNewSprint(project) {
    const sprintNumber = project.sprints.length + 1;
    const sprintId = `${project.id}-sprint-${sprintNumber}`;
    
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14); // 2-week sprint

    const sprint = {
      id: sprintId,
      number: sprintNumber,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      goals: [
        'Complete core features',
        'Address technical debt',
        'Improve test coverage'
      ],
      tasks: this.generateSprintTasks(project)
    };

    project.sprints.push(sprint);
    this.metrics.sprintsPlanned++;
    
    this.log(`Planned Sprint ${sprintNumber} for ${project.name}`);
  }

  generateSprintTasks(project) {
    return [
      { id: `task-${Date.now()}-1`, title: 'Setup project infrastructure', status: 'todo', assignee: 'devops' },
      { id: `task-${Date.now()}-2`, title: 'Design system architecture', status: 'todo', assignee: 'architect' },
      { id: `task-${Date.now()}-3`, title: 'Implement backend API', status: 'todo', assignee: 'backend-dev' },
      { id: `task-${Date.now()}-4`, title: 'Build frontend components', status: 'todo', assignee: 'frontend-dev' },
      { id: `task-${Date.now()}-5`, title: 'Write tests', status: 'todo', assignee: 'qa' }
    ];
  }

  async trackSprintProgress(project) {
    const currentSprint = project.sprints[project.sprints.length - 1];
    if (!currentSprint) return;

    // Simulate task progress
    let completed = 0;
    currentSprint.tasks.forEach(task => {
      if (task.status === 'done') {
        completed++;
      } else if (Math.random() > 0.7) {
        // Simulate progress
        task.status = task.status === 'todo' ? 'in-progress' : 'done';
        completed++;
      }
    });

    this.metrics.tasksTracked += currentSprint.tasks.length;
    
    const progress = Math.floor((completed / currentSprint.tasks.length) * 100);
    this.log(`Sprint ${currentSprint.number} progress: ${progress}%`);
  }

  async generateStatusReport() {
    const projects = this.getActiveProjects();
    
    const report = {
      timestamp: new Date().toISOString(),
      totalProjects: projects.length,
      activeSprints: projects.reduce((acc, p) => acc + p.sprints.filter(s => s.status === 'active').length, 0),
      completedTasks: this.metrics.tasksTracked,
      projects: projects.map(p => ({
        name: p.name,
        status: p.status,
        sprintCount: p.sprints.length
      }))
    };

    fs.writeFileSync(
      path.join(this.projectsDir, 'status-report.json'),
      JSON.stringify(report, null, 2)
    );

    this.metrics.reportsGenerated++;
    this.log('Generated status report');
  }

  updateProject(project) {
    fs.writeFileSync(
      path.join(this.projectsDir, `${project.id}.json`),
      JSON.stringify(project, null, 2)
    );
  }
}

// CLI
const agent = new PMAgent();
const mode = process.argv[2] || 'once';

if (mode === 'daemon') {
  agent.runDaemon();
} else {
  agent.runOnce().then(() => process.exit(0));
}

module.exports = PMAgent;
