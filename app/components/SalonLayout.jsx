import Link from 'next/link';
import Navbar from './Navbar';

const SalonLayout = ({ children, currentPage }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      {/* Use shared Navbar component */}
      <Navbar />

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 mt-20 py-8 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Hair & Care Unisex Salon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default SalonLayout; 