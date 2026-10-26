import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * Generates an SVG avatar customized to the author's academic domain and expertise.
 */
function createDomainFallbackSvg(name: string, domain: string, role: string): string {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Pick color themes based on research domain
  let bgGradientStart = '#78350f'; // amber-900
  let bgGradientEnd = '#451a03'; // amber-950
  let accentColor = '#f59e0b'; // amber-500
  let motifIcon = '🔬';

  const domainLower = domain.toLowerCase() + ' ' + role.toLowerCase();

  if (domainLower.includes('computer') || domainLower.includes('ai') || domainLower.includes('systems') || domainLower.includes('infrastructure')) {
    bgGradientStart = '#1e293b'; // slate-800
    bgGradientEnd = '#0f172a'; // slate-900
    accentColor = '#38bdf8'; // sky-400
    motifIcon = '⚡';
  } else if (domainLower.includes('medicine') || domainLower.includes('health') || domainLower.includes('clinical')) {
    bgGradientStart = '#064e3b'; // emerald-900
    bgGradientEnd = '#022c22'; // emerald-950
    accentColor = '#34d399'; // emerald-400
    motifIcon = '🧬';
  } else if (domainLower.includes('climate') || domainLower.includes('environment') || domainLower.includes('geophysics')) {
    bgGradientStart = '#134e4a'; // teal-900
    bgGradientEnd = '#042f2e'; // teal-950
    accentColor = '#2dd4bf'; // teal-400
    motifIcon = '🌐';
  } else if (domainLower.includes('sociology') || domainLower.includes('policy') || domainLower.includes('economics')) {
    bgGradientStart = '#701a75'; // fuchsia-900
    bgGradientEnd = '#4a044e'; // fuchsia-950
    accentColor = '#e879f9'; // fuchsia-400
    motifIcon = '📊';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <defs>
      <linearGradient id="grad-${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradientStart}" />
        <stop offset="100%" stop-color="${bgGradientEnd}" />
      </linearGradient>
      <pattern id="grid-${initials}" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${accentColor}" stroke-opacity="0.1" stroke-width="1" />
      </pattern>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#grad-${initials})" />
    <rect width="200" height="200" rx="24" fill="url(#grid-${initials})" />
    
    <!-- Domain Background Rings -->
    <circle cx="100" cy="100" r="70" fill="none" stroke="${accentColor}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="4 4" />
    <circle cx="100" cy="100" r="85" fill="none" stroke="${accentColor}" stroke-opacity="0.15" stroke-width="1" />
    
    <!-- Domain Symbol Badge -->
    <circle cx="160" cy="40" r="18" fill="${bgGradientEnd}" stroke="${accentColor}" stroke-width="1.5" />
    <text x="160" y="45" font-size="14" text-anchor="middle" dominant-baseline="middle">${motifIcon}</text>

    <!-- Author Initials Avatar -->
    <text x="100" y="108" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="-1">${initials}</text>
    
    <!-- AI Verification Pill -->
    <rect x="40" y="152" width="120" height="22" rx="11" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="1" />
    <text x="100" y="166" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5">AI RESEARCH AVATAR</text>
  </svg>`;

  return svg;
}

export async function POST(req: NextRequest) {
  try {
    const { name, role, domain, bio, authorId } = await req.json();

    if (!name || !domain) {
      return NextResponse.json({ error: 'Author name and domain are required.' }, { status: 400 });
    }

    // Attempt Gemini AI SVG generation
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `Generate a high-quality, professional, modern SVG profile avatar for a distinguished scholar and researcher:
Name: ${name}
Role: ${role}
Domain/Field: ${domain}
Bio summary: ${bio || domain}

Design Rules:
- Output ONLY pure, valid SVG code starting with <svg> and ending with </svg>. Do NOT wrap in markdown code blocks or quotes.
- ViewBox must be 0 0 200 200 with rx=24 or rounded container.
- Create an aesthetically appealing geometric or abstract scholarly illustration representing their field (${domain}) with their initials (${name.split(' ').map((w: string)=>w[0]).join('')}) integrated smoothly.
- Use professional scholarly palette (deep stone, amber, emerald, indigo, gold).
- High visual quality, vector accuracy, valid SVG tags only.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let svgText = response.text || '';
        svgText = svgText.replace(/```xml|```svg|```/gi, '').trim();

        if (svgText.includes('<svg') && svgText.includes('</svg>')) {
          const start = svgText.indexOf('<svg');
          const end = svgText.lastIndexOf('</svg>') + 6;
          const cleanSvg = svgText.substring(start, end);

          return NextResponse.json({
            svg: cleanSvg,
            authorId,
            source: 'gemini-2.5-flash',
          });
        }
      } catch (geminiError) {
        console.warn('Gemini avatar generation fallback engaged:', geminiError);
      }
    }

    // Fallback domain-customized vector SVG avatar
    const fallbackSvg = createDomainFallbackSvg(name, domain, role);
    return NextResponse.json({
      svg: fallbackSvg,
      authorId,
      source: 'domain-fallback',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal avatar generation error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
