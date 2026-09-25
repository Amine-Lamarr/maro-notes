import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import transparentImg from "../assets/transparent.jpeg";

import ReviewsSection from "../components/ReviewsSection";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Pause video when scrolled out of viewport to save GPU & battery
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col space-y-16 lg:space-y-32 py-4 sm:py-8 lg:py-12 relative px-2 sm:px-6 -mt-[10px] sm:-mt-[30px] overflow-hidden">
      {/* Hero Section */}
      <section className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-8 items-center max-w-7xl mx-auto pt-2 sm:pt-6 md:pt-10 lg:pt-16 min-h-[45vh] md:min-h-[50vh] lg:min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="space-y-5 sm:space-y-6 md:space-y-8 lg:space-y-10 max-w-3xl text-left mr-auto justify-self-start translate-x-0 lg:-translate-x-[50px] px-2 sm:px-0">
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#2563EB] mb-1 sm:mb-3 md:mb-4 inline-block bg-[#EFF6FF] border border-[#DBEAFE] px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-xs font-semibold">
              Premium Study Modules
            </div>
            
            <h1 className="font-serif text-[34px] sm:text-[46px] md:text-[54px] lg:text-[72px] xl:text-[77px] leading-[1.12] sm:leading-[1.08] md:leading-[1.06] tracking-tight text-left text-navy drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)] font-bold">
              Elevate your{" "}
              <span className="inline whitespace-nowrap bg-gradient-to-r from-[#0e2f83] to-[#550e83] bg-clip-text text-transparent">
                <span className="italic">academic</span> <span>journey</span>
              </span>
            </h1>
          </div>

          <p className="text-base sm:text-xl md:text-2xl lg:text-[28px] text-navy-muted font-light leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.06)] max-w-2xl">
            Structured modules designed for success. High-quality PAs and lectures in a secure, distraction-free environment.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 md:gap-6 pt-2 md:pt-3">
            <Link to="/years" className="group w-full sm:w-auto flex items-center justify-center sm:justify-between gap-3 sm:gap-4 bg-white dark:bg-[#111] text-navy px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-5 rounded-full font-medium hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-all duration-300 shadow-sm hover:shadow-md">
              <span className="font-mono font-bold tracking-widest text-xs sm:text-sm uppercase text-navy">Browse Modules</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-navy group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/register" className="w-full sm:w-auto text-center px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-5 bg-[#0d0178] hover:bg-[#1402a8] text-white rounded-full shadow-md shadow-[#0d0178]/30 hover:shadow-lg transition-all duration-300">
              <span className="font-mono font-bold tracking-widest text-xs sm:text-sm uppercase text-white">Join Platform</span>
            </Link>
          </div>
        </div>

        {/* Illustration Area */}
        <div className="relative w-full h-[260px] sm:h-[340px] md:h-[390px] lg:h-[460px] xl:h-[480px] flex items-center justify-center px-2 sm:px-0 mt-4 lg:mt-0">
          <div className="relative z-10 w-full h-full flex items-center justify-center translate-x-0 lg:translate-x-[40px]">
            <div className="group w-full max-w-xl md:max-w-2xl lg:max-w-2xl xl:max-w-[720px] h-full max-h-[380px] md:max-h-[420px] lg:max-h-[440px] flex items-center justify-center rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.65)] transition-all duration-500 ease-out hover:scale-[1.02] md:hover:scale-105 hover:-translate-y-1 md:hover:-translate-y-2 cursor-pointer transform-gpu">
              <video 
                ref={videoRef}
                src="https://stuszciqiavgjmclvdeq.supabase.co/storage/v1/object/public/pics/video.mp4" 
                poster={transparentImg}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover rounded-2xl transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Split Layout: How It Works */}
      <section className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-10 items-center max-w-6xl mx-auto animate-in fade-in slide-from-bottom-8 duration-700 delay-150 relative px-2 sm:px-0 content-auto">
        <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:pr-10 relative z-10 text-center lg:text-left">
          <h2 className="title-text text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-navy font-bold leading-[1.1] sm:leading-[1.06]">
            Seamless<br className="hidden lg:block" /> <span className="text-[#2563EB] italic">Access</span>
          </h2>
          <p className="text-navy-muted text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
            Skip the clutter of generic sharing platforms. MaroNotes offers a curated, sequential learning experience.
          </p>
        </div>
        
        <div className="flex flex-col gap-5 sm:gap-6 md:gap-7 relative z-10">
          {/* Subtle line connecting steps */}
          <div className="absolute left-7 sm:left-8 top-12 bottom-12 w-[1px] bg-[#CBD5E1] z-0 hidden sm:block"></div>

          <div className="bg-white dark:bg-[#111] border border-[#E2E8F0] shadow-md p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row gap-5 sm:gap-7 relative z-10 transition-all hover:scale-[1.02] duration-300 transform-gpu">
            <div className="circle-button w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-br from-[#7000ab] to-[#0c0291] text-white border-none shadow-md shadow-purple-950/20 mx-auto sm:mx-0">
              <span className="font-serif text-lg sm:text-xl font-bold">01</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-xl sm:text-2xl mb-2 text-navy font-bold">Select Year</h3>
              <p className="text-navy-muted text-sm sm:text-base leading-relaxed font-normal">Browse the carefully organized academic years to find modules specifically tailored to your syllabus.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#111] border border-[#E2E8F0] shadow-md p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row gap-5 sm:gap-7 relative z-10 transition-all hover:scale-[1.02] duration-300 transform-gpu">
            <div className="circle-button w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-br from-[#7000ab] to-[#0c0291] text-white border-none shadow-md shadow-purple-950/20 mx-auto sm:mx-0">
              <span className="font-serif text-lg sm:text-xl font-bold">02</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-xl sm:text-2xl mb-2 text-navy font-bold">Secure Unlock</h3>
              <p className="text-navy-muted text-sm sm:text-base leading-relaxed font-normal">Purchase individual courses separately for instant access via a seamless checkout process.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#111] border border-[#E2E8F0] shadow-md p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row gap-5 sm:gap-7 relative z-10 transition-all hover:scale-[1.02] duration-300 transform-gpu">
            <div className="circle-button w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-br from-[#7000ab] to-[#0c0291] text-white border-none shadow-md shadow-purple-950/20 mx-auto sm:mx-0">
              <span className="font-serif text-lg sm:text-xl font-bold">03</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-xl sm:text-2xl mb-2 text-navy font-bold">Immersive Study</h3>
              <p className="text-navy-muted text-sm sm:text-base leading-relaxed font-normal">View high-resolution PDFs directly in your private dashboard with our distraction-free secure viewer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />

    </div>
  );
}
