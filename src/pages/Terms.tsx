import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-navy-muted hover:text-navy transition-colors mb-8 small-caps tracking-widest"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <h1 className="font-serif text-4xl mb-8 text-navy font-bold drop-shadow-sm">Terms of Service</h1>
      
      <div className="space-y-8 text-navy-muted font-light leading-relaxed">
        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using MaroNotes, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">2. Description of Service</h2>
          <p>MaroNotes provides users with access to educational materials, study notes, and related resources. You understand and agree that the service is provided "AS-IS" and that MaroNotes assumes no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">3. Intellectual Property Rights</h2>
          <p>All content included on this site, such as text, graphics, logos, button icons, images, digital downloads, data compilations, and software, is the property of MaroNotes or its content suppliers and protected by international copyright laws. Purchasing notes grants you a limited license for personal use only. Distribution or reproduction of purchased materials without authorization is strictly prohibited.</p>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">4. User Accounts</h2>
          <p>If you create an account on the platform, you are responsible for maintaining the security of your account, and you are fully responsible for all activities that occur under the account and any other actions taken in connection with it. You must immediately notify MaroNotes of any unauthorized uses of your account or any other breaches of security.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">5. Modifications to Service</h2>
          <p>MaroNotes reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. You agree that MaroNotes shall not be liable to you or to any third party for any modification, suspension or discontinuance of the Service.</p>
        </section>

        <div className="pt-8 border-t border-slate-200 text-sm">
          <p className="text-slate-400">Last updated: May 2026</p>
        </div>
      </div>
    </div>
  );
}
