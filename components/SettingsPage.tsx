import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ThemeToggle from '@/components/ThemeToggle';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-ink sm:text-4xl">Settings</h1>
        <p className="mt-2 text-ink-secondary">Customize your experience on this device.</p>
        <section aria-labelledby="appearance-heading" className="mt-8 border-t border-line pt-6">
          <h2 id="appearance-heading" className="mb-4 font-serif text-xl font-bold text-ink">Appearance</h2>
          <ThemeToggle />
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
