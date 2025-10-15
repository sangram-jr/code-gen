import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { exec } from "child_process";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

// Define __dirname for ES Module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const asyncExec = promisify(exec);

// Middleware setup
app.use(cors());
app.use(express.json());

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Utility function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to retry directory removal
const retryRemoveDir = async (dirPath, retries = 5, delayMs = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`Successfully cleaned up temporary directory: ${dirPath}`);
            return;
        } catch (err) {
            if (err.code === 'EBUSY' && i < retries - 1) {
                console.warn(`Cleanup failed, retrying in ${delayMs}ms...`);
                await delay(delayMs);
            } else {
                console.error(`Final cleanup failed for ${dirPath}:`, err);
                throw err;
            }
        }
    }
};

// Basic route to check if the server is running
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Endpoint for AI Code Generation
app.post('/generate-code', async (req, res) => {
    console.log('Received request for code generation.');
    const { prompt } = req.body;

    // System instruction to guide the AI model
    const systemInstruction = `
        You are an expert creative frontend developer. Your job is to take short user prompts and always produce a **visually impressive, interactive, and professional website** using ONLY HTML, CSS, and vanilla JavaScript.

        ⚡ Output Rules:
        1. Always return ONLY a JSON object with exactly 3 keys: "html", "css", "js".
        2. Do NOT include markdown, explanations, or extra text — only valid JSON.
        3. All websites must look polished, reliable, and professional (not plain or empty).

        ---

        🎨 Visual Design:
        - Use **CSS Grid and Flexbox** for layouts.
        - Include **animations** (hover effects, transitions, keyframes).
        - Use **gradients, shadows, rounded corners, and responsive scaling**.
        - If images are needed, create them with **inline SVGs or CSS-only shapes** (do not use external URLs).
        - Include a **header, main content area, and footer** so the page looks like a real website.

        🌀 Interactivity:
        - Add at least one **interactive element** (button, form, tab, slider, modal, or animated component).
        - Use **vanilla JavaScript ES6+** (query selectors, event listeners, state handling).
        - Ensure **responsive behavior** across devices (desktop + mobile).

        ---

        ❌ Constraints:
        1. Always output **3 files**: index.html, style.css, script.js.
        2. Use **only HTML, CSS, and vanilla JavaScript** (no React, Vue, Angular, or backend code).
        3. Always make the design **visually appealing**:
        - Use **modern CSS (flexbox, grid, transitions, shadows, gradients)**.
        - Use **responsive design** (desktop + mobile).
        - Include **base64-encoded images** for photos, backgrounds, and icons.
        - You may still use **inline SVGs** when simpler (for icons/shapes).
        4. Never use external links (no CDN, no external CSS/JS, no external images).
        - If you need an image, embed it as a **base64 data URI** directly in the code.
        5. Always include meaningful sample content (not lorem ipsum).
        - Example: use real names, products, or scenarios.
        6. Keep **code optimized, clean, and well-structured**:
        - Comment tricky parts in JS.
        - Keep CSS organized.
        - Use semantic HTML.

        ---

        Example 1:
        {
        "html": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>My Portfolio</title><link rel=\"stylesheet\" href=\"style.css\"></head><body><header class=\"header\"><nav class=\"nav\"><a href=\"#\" class=\"logo\">MyPortfolio</a><ul class=\"nav-links\"><li class=\"nav-item\"><a href=\"#home\">Home</a></li><li class=\"nav-item\"><a href=\"#projects\">Projects</a></li><li class=\"nav-item\"><a href=\"#contact\">Contact</a></li></ul><button class=\"nav-toggle\" id=\"navToggleBtn\">☰</button></nav></header><main><section id=\"home\" class=\"hero\"><div class=\"hero-content\"><h1>Hello, I'm a Developer</h1><p>Crafting beautiful and functional web experiences.</p><a href=\"#contact\" class=\"cta-button\">Get in Touch</a></div></section><section id=\"projects\" class=\"projects\"><div class=\"project-header\"><h2>Featured Projects</h2><p>A selection of my recent work.</p></div><div class=\"project-grid\"><div class=\"project-card\"><img src=\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSI5NjBweCIgaGVpZ2h0PSI1NDBweCIgdmlld0JveD0iMCAwIDk2MCA1NDAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHRpdGxlPnBsYWNlaG9sZGVyPC90aXRsZT48ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz48ZGVmcz48L2RlZnM+PGcgaWQ9IlBhZ2UtMSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgaWQ9Imdyb3VwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjIuMDAwMDAwLCAtMzEuMDAwMDAwKSI+PGcgaWQ9ImluZm8iPg==\" alt=\"Project Thumbnail\" class=\"project-thumbnail\"><h3>Project One</h3><p class=\"project-description\">A dynamic web application built with modern technologies.</p></div><div class=\"project-card\"><img src=\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSI5NjBweCIgaGVpZ2h0PSI1NDBweCIgdmlld0JveD0iMCAwIDk2MCA1NDAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHRpdGxlPnBsYWNlaG9sZGVyPC90aXRsZT48ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz48ZGVmcz48L2RlZnM+PGcgaWQ9IlBhZ2UtMSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgaWQ9Imdyb3VwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjIuMDAwMDAwLCAtMzEuMDAwMDAwKSI+PGcgaWQ9ImluZm8iPg==\" alt=\"Project Thumbnail\" class=\"project-thumbnail\"><h3>Project Two</h3><p class=\"project-description\">A responsive and accessible e-commerce platform.</p></div></div></section><section id=\"contact\" class=\"contact\"><div class=\"contact-content\"><h2>Contact Me</h2><p>I'm always open to new opportunities. Let's connect!</p><form class=\"contact-form\" id=\"contactForm\"><input type=\"text\" placeholder=\"Your Name\" required><input type=\"email\" placeholder=\"Your Email\" required><textarea placeholder=\"Your Message\" required></textarea><button type=\"submit\" class=\"cta-button\" id=\"submitBtn\">Send Message</button></form><p id=\"formMessage\" class=\"form-message\"></p></div></section></main><footer class=\"footer\"><p>&copy; 2025 MyPortfolio. All rights reserved.</p></footer></body></html>",
        "css": "/* General Styles */:root { --dark-bg: #121212; --light-text: #e0e0e0; --accent-color: #61dafb; --card-bg: #1e1e1e; --footer-bg: #0d0d0d; }* { box-sizing: border-box; margin: 0; padding: 0; }html { scroll-behavior: smooth; }body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: var(--dark-bg); color: var(--light-text); line-height: 1.6; }main { padding-top: 60px; /* Offset for fixed header */ }.header { position: fixed; top: 0; left: 0; width: 100%; background: var(--card-bg); z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.5); }.nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 1rem 2rem; }.logo { font-size: 1.5rem; font-weight: bold; color: var(--accent-color); text-decoration: none; }.nav-links { display: flex; gap: 1.5rem; list-style: none; }.nav-links a { color: var(--light-text); text-decoration: none; font-weight: 500; transition: color 0.3s ease; }.nav-links a:hover { color: var(--accent-color); }.nav-toggle { display: none; background: transparent; border: none; font-size: 2rem; color: var(--accent-color); cursor: pointer; }/* Hero Section */.hero { text-align: center; padding: 8rem 2rem; display: flex; justify-content: center; align-items: center; background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23121212' fill-opacity='1' d='M0,192L48,186.7C96,181,192,171,288,149.3C384,128,480,96,576,90.7C672,85,768,107,864,133.3C960,160,1056,192,1152,186.7C1248,181,1344,139,1392,117.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z'%3E%3C/path%3E%3C/svg%3E\"); background-position: bottom; }.hero-content h1 { font-size: 3.5rem; margin-bottom: 1rem; }.hero-content p { font-size: 1.2rem; max-width: 600px; margin: 0 auto 2rem; }.cta-button { background: var(--accent-color); color: var(--dark-bg); padding: 0.8rem 2rem; text-decoration: none; border-radius: 5px; font-weight: bold; transition: transform 0.2s ease, box-shadow 0.2s ease; }.cta-button:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(97, 218, 251, 0.3); }/* Projects Section */.projects { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }.project-header { text-align: center; margin-bottom: 3rem; }.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }.project-card { background: var(--card-bg); border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.3s ease, box-shadow 0.3s ease; }.project-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.4); }.project-thumbnail { width: 100%; height: 200px; object-fit: cover; display: block; }.project-card h3 { padding: 1rem; }.project-description { padding: 0 1rem 1rem; color: #999; }/* Contact Section */.contact { padding: 4rem 2rem; max-width: 800px; margin: 0 auto; }.contact-content { text-align: center; }.contact-form { display: grid; gap: 1rem; margin-top: 2rem; }.contact-form input, .contact-form textarea { width: 100%; padding: 0.8rem; background: var(--card-bg); border: 1px solid #333; color: var(--light-text); border-radius: 5px; }.contact-form input::placeholder, .contact-form textarea::placeholder { color: #555; }.form-message { margin-top: 1rem; font-weight: bold; }/* Footer */.footer { text-align: center; padding: 2rem; background: var(--footer-bg); margin-top: 4rem; }@media (max-width: 768px) { .nav-links { display: none; } .nav-toggle { display: block; } .header { padding: 0 1rem; } .nav-links.active { display: flex; flex-direction: column; position: absolute; top: 60px; left: 0; width: 100%; background: var(--card-bg); box-shadow: 0 2px 10px rgba(0,0,0,0.5); } .nav-links.active .nav-item { width: 100%; text-align: center; border-bottom: 1px solid #333; } .nav-links.active .nav-item:last-child { border-bottom: none; } .hero { padding: 6rem 2rem; } .hero-content h1 { font-size: 2.5rem; } .project-grid { grid-template-columns: 1fr; } }",
        "js": "document.addEventListener('DOMContentLoaded', () => { const navToggleBtn = document.getElementById('navToggleBtn'); const navLinks = document.querySelector('.nav-links'); navToggleBtn.addEventListener('click', () => { navLinks.classList.toggle('active'); }); const contactForm = document.getElementById('contactForm'); const formMessage = document.getElementById('formMessage'); contactForm.addEventListener('submit', async (e) => { e.preventDefault(); formMessage.textContent = 'Sending...'; formMessage.style.color = '#fff'; const formData = new FormData(contactForm); const data = Object.fromEntries(formData.entries()); try { // Simulate a server request and response const response = await new Promise(resolve => setTimeout(() => { resolve({ success: true, message: 'Message sent successfully!' }); }, 2000)); if (response.success) { formMessage.textContent = response.message; formMessage.style.color = '#22c55e'; contactForm.reset(); } else { throw new Error('Failed to send message.'); } } catch (error) { formMessage.textContent = 'Error: ' + error.message; formMessage.style.color = '#ef4444'; } }); });"
        }

         Example 2:
        {
        "html": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Aura Studios</title><link rel=\"stylesheet\" href=\"style.css\"></head><body><div class=\"loading-overlay\"><div class=\"spinner\"></div></div><header class=\"hero\"><div class=\"hero-content\"><h1>We Build Digital Worlds.</h1><p>Crafting stunning web experiences with a touch of magic.</p><button class=\"cta-button\">Start a Project</button></div></header><main><section id=\"about\" class=\"about\"><h2 class=\"section-title\">Who We Are</h2><p class=\"about-text\">Aura Studios is a collective of passionate designers and developers dedicated to creating innovative and impactful digital solutions. We believe in the power of great design and clean code to bring ideas to life.</p></section><section id=\"services\" class=\"services\"><h2 class=\"section-title\">Our Services</h2><div class=\"service-grid\"><div class=\"service-card\"><div class=\"card-icon\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 16.5C2 13 4 11 8 11s6 2 6 5.5v5.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.5zM12 17a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z\"/><rect x=\"10\" y=\"2\" width=\"12\" height=\"4\" rx=\"2\" ry=\"2\"/><path d=\"M15 14v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V14a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2z\"/></svg></div><h3>Web Design</h3><p>Visually stunning, user-centric interfaces.</p></div><div class=\"service-card\"><div class=\"card-icon\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 13h20M7 8h10M4 18h16M12 3v18\"/></svg></div><h3>App Development</h3><p>Fast, robust, and scalable applications.</p></div><div class=\"service-card\"><div class=\"card-icon\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></svg></div><h3>SEO & Marketing</h3><p>Helping your brand get discovered.</p></div></div></section><section id=\"contact\" class=\"contact\"><h2 class=\"section-title\">Get in Touch</h2><form id=\"contact-form\"><input type=\"text\" placeholder=\"Your Name\" required><input type=\"email\" placeholder=\"Your Email\" required><textarea placeholder=\"Your Message\" required></textarea><button class=\"cta-button\" id=\"submit-btn\">Send Message</button><p class=\"form-status\" id=\"form-status\"></p></form></section></main><footer class=\"footer\"><p>&copy; 2025 Aura Studios. All rights reserved.</p></footer></body></html>",
        "css": ":root { --dark-bg: #1a1a2e; --card-bg: #22253b; --accent-color: #00d7ff; --text-color: #e0e0e0; --light-text: #fff; --font-family: 'Poppins', sans-serif; }@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }@keyframes spinnerRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }* { box-sizing: border-box; margin: 0; padding: 0; }html { scroll-behavior: smooth; }body { font-family: var(--font-family); background-color: var(--dark-bg); color: var(--text-color); line-height: 1.6; }h1, h2, h3 { font-weight: 600; color: var(--light-text); }.loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--dark-bg); z-index: 1000; display: flex; justify-content: center; align-items: center; transition: opacity 0.5s ease; }.loading-overlay.hidden { opacity: 0; pointer-events: none; }.spinner { width: 50px; height: 50px; border: 4px solid rgba(255, 255, 255, 0.2); border-top-color: var(--accent-color); border-radius: 50%; animation: spinnerRotate 0.8s linear infinite; }.hero { min-height: 100vh; display: flex; justify-content: center; align-items: center; text-align: center; background-image: url('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBAQEBAgEBASFCgcHCAoKCg4JCwMDAwMDAw8JCg'); background-size: cover; background-position: center; }.hero-content { background: rgba(0, 0, 0, 0.5); padding: 3rem; border-radius: 10px; }.hero h1 { font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 5px rgba(0,0,0,0.5); }.hero p { font-size: 1.2rem; max-width: 600px; margin: 0 auto 2rem; }.cta-button { background: linear-gradient(45deg, #00d7ff, #00c0ff); color: var(--dark-bg); padding: 0.8rem 2rem; text-decoration: none; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; transition: transform 0.3s ease, box-shadow 0.3s ease; }.cta-button:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(0, 215, 255, 0.4); }.section-title { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; }.about, .services, .contact { padding: 5rem 2rem; opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }.about.animated, .services.animated, .contact.animated { opacity: 1; transform: translateY(0); }.about-text { max-width: 800px; margin: 0 auto; text-align: center; font-size: 1.1rem; }.service-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto; }.service-card { background: var(--card-bg); border-radius: 10px; padding: 2rem; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.3s ease, box-shadow 0.3s ease; }.service-card:hover { transform: translateY(-10px); box-shadow: 0 8px 25px rgba(0,0,0,0.4); }.card-icon svg { color: var(--accent-color); }.service-card h3 { margin: 1rem 0; }.contact { max-width: 600px; margin: 0 auto; }.contact-form { display: grid; gap: 1rem; margin-top: 2rem; }.contact-form input, .contact-form textarea { width: 100%; padding: 0.8rem; background: var(--dark-bg); border: 1px solid var(--card-bg); color: var(--light-text); border-radius: 5px; transition: border-color 0.3s ease; }.contact-form input:focus, .contact-form textarea:focus { border-color: var(--accent-color); outline: none; }.contact-form textarea { resize: vertical; }.form-status { text-align: center; margin-top: 1rem; font-weight: 500; min-height: 20px; }footer { text-align: center; padding: 2rem; background: var(--footer-bg); margin-top: 4rem; }",
        "js": "document.addEventListener('DOMContentLoaded', () => { const loadingOverlay = document.querySelector('.loading-overlay'); setTimeout(() => { loadingOverlay.classList.add('hidden'); }, 1000); const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('animated'); } }); }, { threshold: 0.2 }); const sections = document.querySelectorAll('.about, .services, .contact'); sections.forEach(section => { observer.observe(section); }); const contactForm = document.getElementById('contact-form'); const submitBtn = document.getElementById('submit-btn'); const formStatus = document.getElementById('form-status'); contactForm.addEventListener('submit', async (e) => { e.preventDefault(); submitBtn.disabled = true; formStatus.textContent = 'Sending...'; formStatus.style.color = 'var(--accent-color)'; try { // Simulate a server request and response const response = await new Promise(resolve => setTimeout(() => { resolve({ success: true, message: 'Message sent successfully!' }); }, 2000)); if (response.success) { formStatus.textContent = response.message; formStatus.style.color = '#22c55e'; contactForm.reset(); } else { throw new Error('Failed to send message.'); } } catch (error) { formStatus.textContent = 'Error: ' + error.message; formStatus.style.color = '#ef4444'; } finally { submitBtn.disabled = false; } }); });"
        }

        💡 Goal:
        Even for a very small prompt (like “make a portfolio” or “create a login form”), always produce a **modern, interactive, and reliable website** that feels like a real project.

        Do NOT generate any markdown or explanation. Your response MUST be a single JSON object with three keys: 'html', 'css', and 'js'. The value of each key should be the full code for that file.
        
        IMPORTANT: Your generated code must be completely self-contained. The HTML should link to the style.css and script.js files you generate. Do not embed the CSS and JS directly into the HTML.
    `;

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction
        });

        const result = await model.generateContent(prompt);
        const textResponse = await result.response.text();
        
        // Find the JSON string by locating the first { and last }
        const startIndex = textResponse.indexOf('{');
        const endIndex = textResponse.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("API did not return a valid JSON object.");
        }
        
        // Extract the JSON substring and replace invalid control characters
        let jsonString = textResponse.substring(startIndex, endIndex + 1);
        jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        const jsonResponse = JSON.parse(jsonString);

        console.log('Successfully generated code.');
        res.json(jsonResponse);
    } catch (error) {
        console.error("Error generating code:", error);
        res.status(500).json({ error: "Failed to generate code." });
    }
});

// Endpoint for One-Click Publishing to Vercel
app.post('/publish', async (req, res) => {
    console.log('Received request for publishing to Vercel.');
    const { html, css, js } = req.body;
    const projectDir = path.join(__dirname, 'temp', Date.now().toString());

    try {
        // 1. Create a temporary project directory and files
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'index.html'), html);
        fs.writeFileSync(path.join(projectDir, 'style.css'), css);
        fs.writeFileSync(path.join(projectDir, 'script.js'), js);
        const vercelConfig = {
            "rewrites": [
                {
                    "source": "/(.*)",
                    "destination": "/index.html"
                }
            ]
        };
        fs.writeFileSync(path.join(projectDir, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));

        console.log('Successfully created temporary files for deployment.');

        // 2. Run the Vercel deploy command
        const vercelToken = process.env.VERCEL_TOKEN;
        if (!vercelToken) {
            console.error('Vercel authentication token is missing.');
            return res.status(401).json({ error: 'Vercel authentication token is missing in .env file.' });
        }
        
        const command = `npx vercel --cwd="${projectDir}" --prod --yes --token=${vercelToken}`;

        let stdout, stderr;
        try {
            ({ stdout, stderr } = await asyncExec(command));
        } catch (execError) {
            console.error(`Deploy error: ${execError.message}`);
            console.error(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({ error: 'Failed to deploy to Vercel.' });
        }

        // 3. Find the URL from the command output
        const lines = stdout.split('\n');
        const liveUrlLine = lines.find(line => line.includes('https://') && line.includes('.vercel.app'));
        const liveUrl = liveUrlLine ? liveUrlLine.trim() : 'URL not found.';
        console.log(`Successfully deployed. URL: ${liveUrl}`);

        // 4. Clean up the temporary directory with a retry mechanism
        // This is now handled asynchronously to prevent the EBUSY error from blocking
        retryRemoveDir(projectDir).catch(err => console.error('Final cleanup failed with error:', err));
        
        // 5. Send back the success message with the URL
        res.status(200).json({
            message: 'Successfully deployed to Vercel!',
            url: liveUrl
        });
        
    } catch (error) {
        console.error("File system error:", error);
        res.status(500).json({ error: "Failed to create files for deployment." });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});