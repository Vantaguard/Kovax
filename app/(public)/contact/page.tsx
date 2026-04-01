import PublicNavbar from '@/components/PublicNavbar';

export const metadata = {
  title: 'Contact Us | Kovax',
  description: 'Support and inquiries for the Kovax platform.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <PublicNavbar />
      
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-white mb-6">
            Get in <span className="bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-xl text-slate-400">
            Have questions about Kovax? Our team is here to help you secure and manage your organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-xl hover:border-amber-400/30 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-400/10 rounded-xl">
                <span className="text-2xl">🤝</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Customer Support</h3>
                <p className="text-slate-400 mb-2">Technical issues or platform questions?</p>
                <a href="mailto:support@kovax.com" className="text-amber-400 hover:text-amber-300 font-medium">
                  support@kovax.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-xl hover:border-blue-400/30 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-400/10 rounded-xl">
                <span className="text-2xl">💼</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Sales Inquiries</h3>
                <p className="text-slate-400 mb-2">Custom plans for large organizations?</p>
                <a href="mailto:sales@kovax.com" className="text-amber-400 hover:text-amber-300 font-medium">
                  sales@kovax.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-xl hover:border-amber-400/30 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-400/10 rounded-xl">
                <span className="text-2xl">💻</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Technical Support</h3>
                <p className="text-slate-400 mb-2">Need help with integration?</p>
                <a href="mailto:tech@kovax.com" className="text-amber-400 hover:text-amber-300 font-medium">
                  tech@kovax.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-xl hover:border-blue-400/30 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-400/10 rounded-xl">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Headquarters</h3>
                <p className="text-slate-400">
                  Secure Data Center 101<br />
                  Global Privacy Hub, Digital District
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
