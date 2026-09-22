import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Privacy() {
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

      <h1 className="font-serif text-4xl mb-8 text-navy font-bold drop-shadow-sm">Privacy Policy</h1>
      
      <div className="space-y-8 text-navy-muted font-light leading-relaxed">
        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">1. Information We Collect</h2>
          <p>We collect information to provide better services to all our users. Information we collect includes:</p>
          <ul className="list-disc pl-5 mt-4 space-y-2">
            <li>Information you give us (e.g., your name, email address, password).</li>
            <li>Information we get from your use of our services (e.g., log information, device information).</li>
            <li>Information related to your purchases and accessed materials.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">2. How We Use Information We Collect</h2>
          <p>We use the information we collect from all of our services to provide, maintain, protect and improve them, to develop new ones, and to protect MaroNotes and our users. We also use this information to offer you tailored content – like giving you more relevant suggested study materials.</p>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">3. Information We Share</h2>
          <p>We do not share personal information with companies, organizations and individuals outside of MaroNotes unless one of the following circumstances applies:</p>
          <ul className="list-disc pl-5 mt-4 space-y-2">
            <li>With your consent</li>
            <li>For external processing</li>
            <li>For legal reasons</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">4. Information Security</h2>
          <p>We work hard to protect MaroNotes and our users from unauthorized access to or unauthorized alteration, disclosure or destruction of information we hold. We review our information collection, storage and processing practices, including physical security measures, to guard against unauthorized access to systems.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-serif text-[#0037bc] font-bold mb-4">5. Payment Information</h2>
          <p>Payments are processed by our secure third-party payment processors (e.g., Stripe). We do not store or process your complete credit card numbers or highly sensitive financial information directly on our servers.</p>
        </section>

        <div className="pt-8 border-t border-slate-200 text-sm">
          <p className="text-navy font-bold/40">Last updated: May 2026</p>
        </div>
      </div>
    </div>
  );
}
