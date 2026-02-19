import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Vendor Booking System',
  description: 'Privacy Policy for Vendor Booking & Trip Register System',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Last Updated: {new Date().toLocaleDateString()}</h2>
              <p className="leading-relaxed">
                This Privacy Policy describes how Vendor Booking System ("we," "our," or "us") collects, uses, and shares your personal information when you use our transportation management platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Name and contact information (email, phone number)</li>
                <li>Company details (vendor name, address)</li>
                <li>User authentication credentials (encrypted passwords)</li>
                <li>Role-based access information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2">Trip and Transportation Data</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Vehicle information (vehicle numbers, types)</li>
                <li>Trip details (routes, dates, locations)</li>
                <li>Driver information (names, contact details)</li>
                <li>Financial data (fares, expenses, profit/loss calculations)</li>
                <li>Party and customer information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2">Technical Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and operating system</li>
                <li>Usage patterns and system interactions</li>
                <li>System logs and audit trails</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Provision:</strong> To manage and coordinate transportation services</li>
                <li><strong>User Authentication:</strong> To verify user identity and manage access</li>
                <li><strong>Trip Management:</strong> To schedule, track, and manage transportation trips</li>
                <li><strong>Financial Processing:</strong> To calculate fares, expenses, and profit/loss</li>
                <li><strong>Communication:</strong> To send notifications and updates related to trips</li>
                <li><strong>Analytics:</strong> To improve our services and optimize operations</li>
                <li><strong>Legal Compliance:</strong> To meet legal and regulatory requirements</li>
                <li><strong>Security:</strong> To protect against fraud and ensure system security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
              <p className="mb-4">We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Internal Sharing:</strong> Between authorized users based on role-based access</li>
                <li><strong>Service Providers:</strong> With third-party services necessary for operations</li>
                <li><strong>Legal Requirements:</strong> When required by law or legal process</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
                <li><strong>Safety and Security:</strong> To protect users, property, or the public</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="mb-4">We implement appropriate security measures including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Secure password storage using industry-standard encryption</li>
                <li>Secure data transmission protocols (HTTPS)</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Regular security audits and updates</li>
                <li>Audit logging for system activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Trip data is typically retained for business and compliance purposes. You may request deletion of your account and associated data, subject to legal and operational requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of certain communications</li>
                <li>Export your data</li>
                <li>Restrict processing of your information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h2>
              <p className="leading-relaxed">
                We use cookies and similar technologies to enhance your experience, maintain sessions, and analyze usage patterns. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Third-Party Services</h2>
              <p className="mb-4">Our platform may integrate with third-party services including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment processing services</li>
                <li>Communication platforms (WhatsApp, SMS)</li>
                <li>Analytics and monitoring tools</li>
                <li>Cloud hosting providers</li>
              </ul>
              <p className="leading-relaxed">
                These services have their own privacy policies and data handling practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="leading-relaxed">
                Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="mb-4">If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Email:</strong> privacy@transport.com</p>
                <p><strong>Address:</strong> 123 Transport St, City</p>
                <p><strong>Phone:</strong> +1234567890</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
