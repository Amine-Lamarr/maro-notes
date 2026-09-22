import { Link } from "react-router";
import { ArrowRight, BookOpen, ShieldCheck, Zap } from "lucide-react";
import transparentImg from "../assets/transparent.jpeg";

import ReviewsSection from "../components/ReviewsSection";

export default function Home() {
  return (
    <div className="flex flex-col space-y-16 lg:space-y-32 py-8 lg:py-12 relative px-4 sm:px-6 -mt-[30px]">
      {/* Hero Section */}
      <section className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl mx-auto pt-8 md:pt-16 min-h-[50vh] md:min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        <div className="space-y-7 lg:space-y-10 max-w-3xl text-left mr-auto justify-self-start -translate-x-[50px]">
          <div className="space-y-5">
            <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#2563EB] mb-4 inline-block bg-[#EFF6FF] border border-[#DBEAFE] px-5 py-2 rounded-full shadow-xs font-semibold">
              Premium Study Modules
            </div>
            
            <h1 className="font-serif text-[45px] sm:text-[53px] md:text-[63px] lg:text-[77px] leading-[1.06] tracking-tight text-left text-navy drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)] font-bold">
              Elevate your <br className="hidden sm:block" />
              <span className="whitespace-nowrap inline-block bg-gradient-to-r from-[#0e2f83] to-[#550e83] bg-clip-text text-transparent">
                <span className="italic">academic</span> <span>journey</span>
              </span>
            </h1>
          </div>

          <p className="text-xl sm:text-2xl md:text-[29px] text-navy-muted font-light leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.06)] max-w-2xl">
            Structured modules designed for success. High-quality PAs and lectures in a secure, distraction-free environment.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-3">
            <Link to="/years" className="group w-full sm:w-auto flex items-center justify-center sm:justify-between gap-4 bg-white dark:bg-[#111] dark:bg-[#111] text-navy px-8 py-4 sm:px-10 sm:py-5 rounded-full font-medium hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-all duration-300 shadow-sm hover:shadow-md">
              <span className="font-mono font-bold tracking-widest text-xs sm:text-sm uppercase text-navy">Browse Modules</span>
              <ArrowRight className="w-5 h-5 text-navy group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/register" className="w-full sm:w-auto text-center px-8 py-4 sm:px-10 sm:py-5 bg-[#0d0178] hover:bg-[#1402a8] text-white rounded-full shadow-md shadow-[#0d0178]/30 hover:shadow-lg transition-all duration-300">
              <span className="font-mono font-bold tracking-widest text-xs sm:text-sm uppercase text-white">Join Platform</span>
            </Link>
          </div>
        </div>

        {/* Illustration Area */}
        <div className="relative w-full h-[320px] md:h-[420px] lg:h-[480px] flex items-center justify-center">
          <div className="relative z-10 w-full h-full flex items-center justify-center translate-x-[20px] lg:translate-x-[40px]">
            <div className="group w-full max-w-xl lg:max-w-2xl xl:max-w-[720px] h-full max-h-[440px] flex items-center justify-center rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.65)] transition-all duration-500 ease-out hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <video 
                src="https://stuszciqiavgjmclvdeq.supabase.co/storage/v1/object/public/pics/video.mp4" 
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-2xl transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Split Layout: How It Works */}
      <section className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center max-w-6xl mx-auto animate-in fade-in slide-from-bottom-8 duration-1000 delay-150 relative">
        <div className="space-y-6 md:space-y-8 lg:pr-10 relative z-10 text-center lg:text-left">
          <h2 className="title-text text-6xl md:text-7xl lg:text-8xl text-navy font-bold leading-[1.05]">Seamless<br className="hidden lg:block" /><span className="text-[#2563EB] italic">Access</span></h2>
          <p className="text-navy-muted text-xl md:text-2xl lg:text-3xl leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
            Skip the clutter of generic sharing platforms. MaroNotes offers a curated, sequential learning experience.
          </p>
        </div>
        
        <div className="flex flex-col gap-7 relative z-10">
          {/* Subtle line connecting steps */}
          <div className="absolute left-7 sm:left-8 top-12 bottom-12 w-[1px] bg-[#CBD5E1] z-0 hidden sm:block"></div>

          <div className="bg-white dark:bg-[#111] dark:bg-[#111] border border-[#E2E8F0] shadow-md p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row gap-5 sm:gap-7 relative z-10 transition-all hover:scale-[1.02] duration-300">
            <div className="circle-button w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-br from-[#7000ab] to-[#0c0291] text-white border-none shadow-md shadow-purple-950/20 mx-auto sm:mx-0">
              <span className="font-serif text-lg sm:text-xl font-bold">01</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-xl sm:text-2xl mb-2 text-navy font-bold">Select Year</h3>
              <p className="text-navy-muted text-sm sm:text-base leading-relaxed font-normal">Browse the carefully organized academic years to find modules specifically tailored to your syllabus.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#111] dark:bg-[#111] border border-[#E2E8F0] shadow-md p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row gap-5 sm:gap-7 relative z-10 transition-all hover:scale-[1.02] duration-300">
            <div className="circle-button w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-br from-[#7000ab] to-[#0c0291] text-white border-none shadow-md shadow-purple-950/20 mx-auto sm:mx-0">
              <span className="font-serif text-lg sm:text-xl font-bold">02</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-xl sm:text-2xl mb-2 text-navy font-bold">Secure Unlock</h3>
              <p className="text-navy-muted text-sm sm:text-base leading-relaxed font-normal">Purchase individual courses separately for instant access via a seamless checkout process.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#111] dark:bg-[#111] border border-[#E2E8F0] shadow-md p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row gap-5 sm:gap-7 relative z-10 transition-all hover:scale-[1.02] duration-300">
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

      {/* Minimal Features Grid */}
      <section className="relative max-w-6xl mx-auto w-full p-10 sm:p-14 lg:p-16 mt-10 md:mt-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 rounded-[2.5rem] bg-gradient-to-br from-[#7000ab]/[0.08] via-[#2563EB]/[0.04] to-[#0c0291]/[0.09] border border-purple-200/60 shadow-lg">
        <div className="grid md:grid-cols-3 gap-8 sm:gap-10 text-center md:text-left relative">
          <div className="space-y-5 relative z-10 bg-white dark:bg-[#111] dark:bg-[#111]/85 backdrop-blur-sm p-8 sm:p-9 rounded-3xl border border-purple-100/90 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.03]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white mx-auto md:mx-0 shadow-lg shadow-purple-950/25">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-serif text-2xl sm:text-3xl text-navy font-bold">Curated Structure</h4>
            <p className="text-base sm:text-lg text-navy-muted font-normal leading-relaxed">Expertly organized by syllabus structure so you only see what you need to succeed.</p>
          </div>
          
          <div className="space-y-5 relative z-10 bg-white dark:bg-[#111] dark:bg-[#111]/85 backdrop-blur-sm p-8 sm:p-9 rounded-3xl border border-purple-100/90 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.03]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white mx-auto md:mx-0 shadow-lg shadow-purple-950/25">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-serif text-2xl sm:text-3xl text-navy font-bold">Private & Secure</h4>
            <p className="text-base sm:text-lg text-navy-muted font-normal leading-relaxed">State-of-the-art PDF viewer preventing unauthorized sharing, ensuring content value remains intact.</p>
          </div>
          
          <div className="space-y-5 relative z-10 bg-white dark:bg-[#111] dark:bg-[#111]/85 backdrop-blur-sm p-8 sm:p-9 rounded-3xl border border-purple-100/90 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.03]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white mx-auto md:mx-0 shadow-lg shadow-purple-950/25">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-serif text-2xl sm:text-3xl text-navy font-bold">Instant Availability</h4>
            <p className="text-base sm:text-lg text-navy-muted font-normal leading-relaxed">Zero delays. Materials are unlocked and ready the very second your transaction completes.</p>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />

    </div>
  );
}
