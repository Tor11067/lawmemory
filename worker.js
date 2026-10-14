import { onRequest as handleSetup } from './functions/api/setup.js';
import { onRequestGet as getSections, onRequestPost as saveSection, onRequestDelete as deleteSection } from './functions/api/sections.js';
import { onRequestGet as getProgress, onRequestPost as saveProgress, onRequestDelete as deleteProgress } from './functions/api/progress.js';
import { onRequestGet as getStats, onRequestPost as saveStats } from './functions/api/stats.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    const context = { request, env, params: {} };

    // API Endpoints for Cloudflare D1 Database
    if (pathname === '/api/setup') {
      return handleSetup(context);
    }
    if (pathname === '/api/sections') {
      if (method === 'GET') return getSections(context);
      if (method === 'POST') return saveSection(context);
      if (method === 'DELETE') return deleteSection(context);
    }
    if (pathname === '/api/progress') {
      if (method === 'GET') return getProgress(context);
      if (method === 'POST') return saveProgress(context);
      if (method === 'DELETE') return deleteProgress(context);
    }
    if (pathname === '/api/stats') {
      if (method === 'GET') return getStats(context);
      if (method === 'POST') return saveStats(context);
    }

    // Static Assets Fallback
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
