import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Vendor Booking System',
  description: 'Terms of Service for Vendor Booking & Trip Register System',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Last Updated: {new Date().toLocaleDateString()}</h2>
              <p className="leading-relaxed">
                These Terms of Service govern your use of the Vendor Booking System platform and services. By accessing or using our service, you agree to be bound by these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By creating an account and using the Vendor Booking System, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <p className="leading-relaxed mb-4">
                Vendor Booking System is a transportation management platform that provides:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Trip scheduling and management</li>
                <li>Vendor and driver coordination</li>
                <li>Financial tracking and reporting</li>
                <li>Real-time notifications</li>
                <li>Audit logging and compliance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
              <p className="mb-4">As a user of our platform, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the platform for legitimate business purposes only</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not engage in fraudulent or malicious activities</li>
                <li>Respect the privacy and rights of other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Account Registration</h2>
              <p className="leading-relaxed">
                To use our service, you must create an account with accurate information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data and Content</h2>
              <p className="mb-4">Regarding data and content on our platform:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You retain ownership of your data</li>
                <li>You grant us license to use your data to provide the service</li>
                <li>You are responsible for the accuracy of your data</li>
                <li>We may use anonymized data for analytics and improvement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Payment and Fees</h2>
              <p className="leading-relaxed">
                Certain features of our platform may require payment of fees. All fees are clearly communicated before purchase. You agree to provide valid payment information and authorize charges for services you use.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Prohibited Activities</h2>
              <p className="mb-4">You may not use our platform to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Engage in illegal activities</li>
                <li>Violate transportation regulations</li>
                <li>Submit false or misleading information</li>
                <li>Interfere with system operations</li>
                <li>Distribute malware or harmful code</li>
                <li>Harass or abuse other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="leading-relaxed">
                The Vendor Booking System and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Service Availability</h2>
              <p className="leading-relaxed">
                We strive to maintain high service availability but cannot guarantee uninterrupted access. We may temporarily suspend service for maintenance, updates, or other operational reasons.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="leading-relaxed">
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our service, including but not limited to loss of profits or business interruption.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of our service or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Termination</h2>
              <p className="leading-relaxed">
                We may terminate or suspend your account at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the service will cease immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>
              <p className="leading-relaxed">
                Any disputes arising from these terms or your use of our service will be resolved through binding arbitration in accordance with applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="leading-relaxed">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of any modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="mb-4">For questions about these Terms of Service, please contact us:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Email:</strong> legal@transport.com</p>
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
