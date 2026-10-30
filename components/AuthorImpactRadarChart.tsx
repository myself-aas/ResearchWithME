'use client';

import { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Award } from 'lucide-react';
import { Author } from '@/lib/blog-data';
import VideoEmbed from '@/components/VideoEmbed';
import { hasVideo } from '@/lib/videos';

export interface ImpactMetrics {
  articleQuality: number;
  communityEngagement: number;
  methodologyRigor: number;
  citationImpact: number;
  openTransparency: number;
}

interface AuthorImpactRadarChartProps {
  author: Author;
  articleCount: number;
  totalLikes: number;
  totalComments: number;
}

/**
 * Builds five illustrative scores for an author from their id and activity counters.
 */
export function getAuthorImpactMetrics(
  author: Author,
  articleCount: number,
  totalLikes: number,
  totalComments: number,
): ImpactMetrics {
  // Derived from the id so the scores stay stable between renders.
  const hash = author.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const baseQuality = 85 + (hash % 11); // 85 - 95
  const baseEngagement = Math.min(98, 75 + Math.floor(totalComments / 2) + (hash % 10));
  const baseRigor = author.verifiedVia === 'orcid' ? 95 : author.verifiedVia === 'github' ? 92 : 88;
  const baseCitation = Math.min(97, 80 + Math.floor(totalLikes / 5) + (hash % 8));
  const baseTransparency = author.orcid || author.github ? 96 : 89;

  return {
    articleQuality: baseQuality,
    communityEngagement: baseEngagement,
    methodologyRigor: baseRigor,
    citationImpact: baseCitation,
    openTransparency: baseTransparency,
  };
}

export default function AuthorImpactRadarChart({
  author,
  articleCount,
  totalLikes,
  totalComments,
}: AuthorImpactRadarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const metrics = getAuthorImpactMetrics(author, articleCount, totalLikes, totalComments);

  const chartData = [
    { subject: 'Review quality', score: metrics.articleQuality, fullMark: 100 },
    { subject: 'Community engagement', score: metrics.communityEngagement, fullMark: 100 },
    { subject: 'Method rigor', score: metrics.methodologyRigor, fullMark: 100 },
    { subject: 'Citation reach', score: metrics.citationImpact, fullMark: 100 },
    { subject: 'Open verification', score: metrics.openTransparency, fullMark: 100 },
  ];

  const overallScore = Math.round(
    (metrics.articleQuality +
      metrics.communityEngagement +
      metrics.methodologyRigor +
      metrics.citationImpact +
      metrics.openTransparency) /
      5
  );

  return (
    <section
      aria-labelledby="author-impact-heading"
      className="mt-8 rounded-lg border border-stone-200 bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h2
            id="author-impact-heading"
            className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl"
          >
            Impact profile
          </h2>
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-stone-600">
            Five scores built from this prototype&apos;s own counters. They are illustrative, not measured.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50/60 p-3.5 sm:px-5">
          <Award className="h-8 w-8 text-amber-900 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Average of the five
            </div>
            <div className="font-serif text-2xl font-bold text-stone-900">
              {overallScore} <span className="text-xs font-sans font-normal text-stone-600">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Radar Chart Container — animated video for authors with a rendered composition */}
        <div className="lg:col-span-7 bg-stone-50/80 rounded-lg overflow-hidden border border-stone-200/80 flex flex-col items-center justify-center min-h-[320px]">
          {author.id === 'marcus-vance' && hasVideo('/videos/radar-chart.mp4') ? (
            <div className="relative w-full h-[320px] bg-stone-50">
              <VideoEmbed
                src="/videos/radar-chart.mp4"
                label={`Impact metrics animation for ${author.name}`}
                ambient
              />
            </div>
          ) : mounted ? (
            <div className="w-full h-[320px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#1c1917', fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: '#57534e', fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-md border border-stone-200 bg-white p-2.5 shadow-md text-xs font-sans">
                            <p className="font-semibold text-stone-900">{data.subject}</p>
                            <p className="text-amber-900 font-serif font-bold text-sm mt-0.5">
                              {data.score} / 100
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Radar
                    name={author.name}
                    dataKey="score"
                    stroke="#78350f"
                    fill="#78350f"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-stone-500">
              Loading the chart…
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between p-3 rounded-md border border-stone-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-amber-800" />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">Review quality</span>
                <span className="text-xs text-stone-600">Depth of each review</span>
              </div>
            </div>
            <span className="font-serif text-lg font-bold text-stone-900">{metrics.articleQuality} / 100</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-stone-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-amber-700" />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">Community engagement</span>
                <span className="text-xs text-stone-600">Comments and discussion</span>
              </div>
            </div>
            <span className="font-serif text-lg font-bold text-stone-900">{metrics.communityEngagement} / 100</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-stone-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-700" />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">Method rigor</span>
                <span className="text-xs text-stone-600">Code and data in the artifact</span>
              </div>
            </div>
            <span className="font-serif text-lg font-bold text-emerald-900">{metrics.methodologyRigor} / 100</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-stone-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-amber-900" />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">Citation reach</span>
                <span className="text-xs text-stone-600">Citations and public interest</span>
              </div>
            </div>
            <span className="font-serif text-lg font-bold text-stone-900">{metrics.citationImpact} / 100</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-stone-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-800" />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">Open verification</span>
                <span className="text-xs text-stone-600">ORCID and GitHub records on file</span>
              </div>
            </div>
            <span className="font-serif text-lg font-bold text-emerald-900">{metrics.openTransparency} / 100</span>
          </div>
        </div>
      </div>
    </section>
  );
}
