#!/usr/bin/env python3
"""
Simple Web Interface for Trailer Narrative AI
Run this to test the trailer generator in your browser!

Usage:
    python web_interface.py

Then open: http://localhost:8000
"""

from flask import Flask, render_template_string, request, jsonify, send_file
import subprocess
import json
import os
from pathlib import Path
import threading

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Trailer AI - Test Interface</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .form-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
        }
        input[type="text"], input[type="file"], select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            width: 100%;
        }
        button:hover {
            transform: translateY(-2px);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .status {
            margin-top: 30px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 10px;
            display: none;
        }
        .status.show {
            display: block;
        }
        .status h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        .progress {
            background: #e0e0e0;
            border-radius: 10px;
            height: 30px;
            overflow: hidden;
            margin: 15px 0;
        }
        .progress-bar {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            height: 100%;
            width: 0%;
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }
        .trailers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .trailer-card {
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }
        .trailer-card h4 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .trailer-card video {
            width: 100%;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .existing-projects {
            margin-top: 40px;
            padding-top: 40px;
            border-top: 2px solid #e0e0e0;
        }
        .project-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .project-item {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #e0e0e0;
            cursor: pointer;
            transition: all 0.3s;
        }
        .project-item:hover {
            border-color: #667eea;
            transform: translateY(-2px);
        }
        .project-item h4 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .project-item p {
            color: #666;
            margin: 5px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Trailer AI Generator</h1>
        <p class="subtitle">AI-powered trailer generation for your videos</p>

        <form id="trailerForm">
            <div class="form-group">
                <label for="projectId">Project Name</label>
                <input type="text" id="projectId" name="projectId" placeholder="e.g., My-Movie" required>
            </div>

            <div class="form-group">
                <label for="videoPath">Video File Path</label>
                <input type="text" id="videoPath" name="videoPath"
                       placeholder="/path/to/your/video.mp4" required>
                <small style="color: #666;">Enter the full path to your video file</small>
            </div>

            <div class="form-group">
                <label for="title">Movie/Show Title</label>
                <input type="text" id="title" name="title" placeholder="Movie Title" required>
            </div>

            <div class="form-group">
                <label for="genre">Genre</label>
                <select id="genre" name="genre">
                    <option value="drama">Drama</option>
                    <option value="action">Action</option>
                    <option value="comedy">Comedy</option>
                    <option value="thriller">Thriller</option>
                    <option value="romance">Romance</option>
                    <option value="horror">Horror</option>
                </select>
            </div>

            <button type="submit" id="generateBtn">🚀 Generate Trailers</button>
        </form>

        <div id="status" class="status">
            <h3>Processing...</h3>
            <div class="progress">
                <div id="progressBar" class="progress-bar">0%</div>
            </div>
            <p id="statusText">Initializing...</p>
            <div id="trailersGrid" class="trailers-grid"></div>
        </div>

        <div class="existing-projects">
            <h2>📁 Existing Projects</h2>
            <div id="projectsList" class="project-list"></div>
        </div>
    </div>

    <script>
        // Load existing projects
        async function loadProjects() {
            const response = await fetch('/api/projects');
            const projects = await response.json();
            const list = document.getElementById('projectsList');

            if (projects.length === 0) {
                list.innerHTML = '<p style="color: #666;">No projects yet. Generate your first trailer!</p>';
                return;
            }

            list.innerHTML = projects.map(project => `
                <div class="project-item" onclick="viewProject('${project.name}')">
                    <h4>${project.name}</h4>
                    <p>📊 Trailers: ${project.trailer_count}</p>
                    <p>📅 ${project.date}</p>
                </div>
            `).join('');
        }

        function viewProject(name) {
            fetch(`/api/project/${name}`)
                .then(r => r.json())
                .then(data => {
                    const grid = document.getElementById('trailersGrid');
                    grid.innerHTML = data.trailers.map(t => `
                        <div class="trailer-card">
                            <h4>${t.name}</h4>
                            <video controls src="/api/video/${name}/${t.file}"></video>
                        </div>
                    `).join('');
                    document.getElementById('status').classList.add('show');
                    document.getElementById('statusText').innerHTML =
                        `<strong>Project: ${name}</strong><br>Found ${data.trailers.length} trailers`;
                });
        }

        // Handle form submission
        document.getElementById('trailerForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            const payload = {
                projectId: data.projectId,
                localFilePath: data.videoPath,
                contentMetadata: {
                    title: data.title,
                    genre: data.genre,
                    language: "hindi",
                    targetDuration: 90
                },
                narrativeStyles: ["dramatic", "action"],
                outputOptions: {
                    generateTrailerVideos: true
                }
            };

            document.getElementById('generateBtn').disabled = true;
            document.getElementById('status').classList.add('show');
            document.getElementById('progressBar').style.width = '10%';
            document.getElementById('progressBar').textContent = '10%';
            document.getElementById('statusText').textContent = 'Starting trailer generation...';

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('progressBar').style.width = '100%';
                    document.getElementById('progressBar').textContent = '100%';
                    document.getElementById('statusText').textContent =
                        'Generation complete! Check output folder: ' + result.output_path;
                    setTimeout(() => loadProjects(), 1000);
                } else {
                    document.getElementById('statusText').textContent = 'Error: ' + result.error;
                }
            } catch (error) {
                document.getElementById('statusText').textContent = 'Error: ' + error.message;
            } finally {
                document.getElementById('generateBtn').disabled = false;
            }
        });

        // Load projects on page load
        loadProjects();
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/projects')
def get_projects():
    output_dir = Path('./output')
    projects = []

    if output_dir.exists():
        for project_dir in output_dir.iterdir():
            if project_dir.is_dir() and not project_dir.name.startswith(('_', '.')):
                trailers_dir = project_dir / 'trailers'
                trailer_count = 0
                if trailers_dir.exists():
                    trailer_count = len(list(trailers_dir.glob('*.mp4')))

                projects.append({
                    'name': project_dir.name,
                    'trailer_count': trailer_count,
                    'date': project_dir.stat().st_mtime
                })

    projects.sort(key=lambda x: x['date'], reverse=True)
    for p in projects:
        from datetime import datetime
        p['date'] = datetime.fromtimestamp(p['date']).strftime('%Y-%m-%d %H:%M')

    return jsonify(projects)

@app.route('/api/project/<project_name>')
def get_project(project_name):
    trailers_dir = Path(f'./output/{project_name}/trailers')
    trailers = []

    if trailers_dir.exists():
        for trailer in trailers_dir.glob('*.mp4'):
            trailers.append({
                'name': trailer.stem.replace('_', ' ').title(),
                'file': trailer.name,
                'size': f"{trailer.stat().st_size / (1024*1024):.1f} MB"
            })

    return jsonify({'trailers': trailers})

@app.route('/api/video/<project>/<filename>')
def serve_video(project, filename):
    video_path = Path(f'./output/{project}/trailers/{filename}')
    if video_path.exists():
        return send_file(video_path, mimetype='video/mp4')
    return jsonify({'error': 'Video not found'}), 404

@app.route('/api/generate', methods=['POST'])
def generate_trailer():
    data = request.json

    def run_generation():
        try:
            cmd = ['python', 'main.py', json.dumps(data)]
            subprocess.run(cmd, check=True, capture_output=True, text=True)
        except Exception as e:
            print(f"Generation error: {e}")

    # Run in background
    thread = threading.Thread(target=run_generation)
    thread.start()

    return jsonify({
        'success': True,
        'message': 'Trailer generation started',
        'output_path': f'./output/{data["projectId"]}'
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🎬 Trailer AI Web Interface")
    print("=" * 60)
    print("\n✅ Server starting on http://localhost:8000")
    print("\n📝 Open your browser and go to: http://localhost:8000")
    print("\n💡 Existing trailers will be shown automatically")
    print("=" * 60)

    app.run(host='0.0.0.0', port=8000, debug=True)
