const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

const regex = /useEffect\(\(\) => \{\n    const handleSuccess = async \(\) => \{[\s\S]*?handleSuccess\(\);\n  \}, \[params, navigate\]\);/;

const replacement = `useEffect(() => {
    const handleSuccess = async () => {
      if (params.get('success') === 'true' && params.get('session_id')) {
        const sessionId = params.get('session_id');
        const noteId = params.get('note_id');
        const moduleId = params.get('module_id');
        
        try {
          toast.loading("Verifying payment...", { id: "verify" });
          const res = await fetch('/api/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          });
          
          const data = await res.json();
          if (data.success) {
            toast.success('Payment successful! Document unlocked.', { id: "verify" });
          } else {
            throw new Error(data.message || "Payment verification failed");
          }
        } catch (err: any) {
          toast.error(err.message, { id: "verify" });
        }

        if (moduleId && noteId) {
          navigate(\`/modules/\${moduleId}/viewer?note=\${noteId}\`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    };
    handleSuccess();
  }, [params, navigate]);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', code);
