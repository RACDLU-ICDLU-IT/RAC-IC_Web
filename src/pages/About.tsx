import { supabase } from '../supabase';
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Target } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const { tenant } = useTenant();
  const headerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<any>({});

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor = isLight ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]';

  useEffect(() => {
    supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single().then(({ data }) => {
      if (data && data.data) {
        setContent(data.data);
      }
    });
    
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'power4.inOut' }
      );
    }
  }, [tenant.id]);

  return (
    <div className="bg-[var(--color-page-bg)]">
      <SEOHead 
        title="About Us"
        description={`Learn about the history, mission, and values of the ${tenant.fullName}. Joining communities and developing youth leadership.`}
        canonicalPath="/about"
      />
      {/* Hero */}
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center overflow-hidden pt-24" ref={headerRef}>
        <img src={content.aboutHeroImage || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80"} alt="About us hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 ${isLight ? 'bg-[var(--color-accent)]/70' : 'bg-primary/60'}`}></div>
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-5xl md:text-8xl font-heading font-bold mb-4">Our Story</h1>
          <p className="text-xl md:text-2xl font-medium max-w-2xl mx-auto opacity-90">Driven by passion, united by service.</p>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Mission', icon: <Target className="w-8 h-8" />, desc: content?.aboutMission || 'To empower youth to take action, develop leadership skills, and create positive change in our communities.' },
            { title: 'Vision', icon: <Target className="w-8 h-8" />, desc: content?.aboutVision || 'A world where young people are actively leading the charge toward sustainable, equitable futures.' },
            { title: 'Values', icon: <Target className="w-8 h-8" />, desc: content?.aboutValues || 'Integrity, Compassion, Innovation, and Service Above Self.' }
          ].map((item, i) => (
            <div key={i} className="group p-8 md:p-12 bg-white rounded-2xl shadow-sm border border-gray-100 transition-colors duration-500 hover:bg-accent cursor-default relative overflow-hidden">
              <div className="text-accent group-hover:text-white mb-6 transition-colors duration-500">{item.icon}</div>
              <h3 className="text-2xl font-bold font-heading mb-4 text-gray-950 group-hover:text-white transition-colors duration-500">{item.title}</h3>
              <p className="text-gray-600 group-hover:text-white/80 transition-colors duration-500 leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Club History Timeline */}
      <section className="py-24 bg-white border-y border-gray-100 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`text-4xl md:text-6xl font-heading font-bold text-center ${headingColor} mb-24`}>The Journey.</h2>
          <div className="space-y-16 relative">
            {/* Vertical Line */}
            <div className="absolute left-0 md:left-32 top-0 bottom-0 w-px bg-gray-200"></div>
            
            {(content.aboutJourney || [
              { year: '2021', text: 'Club chartered with 20 founding members.' },
              { year: '2022', text: 'Reached 100 members and launched our first international exchange.' },
              { year: '2023', text: 'Awarded Presidential Citation by Rotary International for outstanding community impact.' },
              { year: '2024', text: 'Expanded community projects and focused on local sustainability.' },
              { year: '2025', text: 'Hosted the largest district conference for youth leaders.' },
              { year: '2026', text: 'Launching the digital platform to expand our reach entirely.' }
            ]).map((milestone: any, i: number) => (
              <div key={i} className="flex flex-col md:flex-row relative">
                <div className="md:w-32 shrink-0 py-2">
                  <span className="text-5xl font-heading font-bold text-gray-300">{milestone.year}</span>
                </div>
                <div className="relative pl-8 md:pl-16 py-4">
                  {/* Dot */}
                  <div className="absolute left-[-4px] md:left-[-16px] top-7 w-2 h-2 rounded-full bg-accent ring-4 ring-white"></div>
                  <p className={`text-xl ${isLight ? 'text-gray-800' : 'text-primary'} font-medium`}>{milestone.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rotary Affiliation */}
      <section 
        className="text-white"
        style={{ backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[60vh]">
          <div className="p-12 md:p-24 flex flex-col justify-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-8">
              <span className={`font-heading font-bold text-2xl ${isLight ? 'text-white' : 'text-accent'}`}>R</span>
            </div>
            <h2 className={`text-sm font-bold tracking-widest ${isLight ? 'text-white/80' : 'text-gray-500'} uppercase mb-4`}>Our Sponsor</h2>
            <h3 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-white">
              {tenant.parentOrgUrl ? (
                <a href={tenant.parentOrgUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {tenant.parentOrg}
                </a>
              ) : (
                tenant.parentOrg
              )}
            </h3>
            <p className={`text-lg ${isLight ? 'text-white/90' : 'text-gray-400'} mb-8 leading-relaxed`}>
              We are proudly sponsored by the {tenant.parentOrg}, {tenant.district}. Our affiliation gives us access to a global network of 1.2 million neighbors, friends, leaders, and problem-solvers who see a world where people unite and take action to create lasting change.
            </p>
          </div>
          <div className="relative min-h-[40vh]">
            <img src={content.aboutRotaryImage || "https://images.unsplash.com/photo-1543286386-2e659306cd6c?auto=format&fit=crop&q=80"} alt="Rotary collaboration" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </section>
    </div>
  );
}
