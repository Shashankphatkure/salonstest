import ServicesSection from '../components/ServicesSection';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Services - Shashank\'s Salon',
  description: 'Explore our premium salon services with membership benefits.',
};

export default function Services() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      {/* Use the shared Navbar component */}
      <Navbar />

      <div className="container mx-auto py-10 px-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Our Services</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Explore our premium services and exclusive membership benefits.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/services/categories">
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
                Manage Categories
              </button>
            </Link>
            <Link href="/services/create">
              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg">
                Add New Service
              </button>
            </Link>
          </div>
        </div>

        <ServicesSection />

        <div className="mt-16 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Book Your Service Today</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Become a member to unlock exclusive discounts and rewards on all our services.
            Our memberships start from just ₹2,000 with benefits worth much more!
          </p>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            <Link href="/">
              <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
                View Membership Plans
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg">
                Member Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 mt-20 py-8 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Hair & Care Unisex Salon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 