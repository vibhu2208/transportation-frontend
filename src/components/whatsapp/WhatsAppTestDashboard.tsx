'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface WhatsAppMessage {
  id: string;
  timestamp: string;
  from: string;
  message: string;
  rawPayload: any;
  processed: boolean;
}

export function WhatsAppTestDashboard() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [testCredentials, setTestCredentials] = useState({
    phoneNumberId: '943122808892033',
    businessAccountId: '1232938748355101'
  });

  // Fetch messages from backend
  const fetchMessages = async () => {
    try {
      const response = await api.get('/whatsapp/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Fetch test credentials from backend
  const fetchCredentials = async () => {
    try {
      const response = await api.get('/whatsapp/test-credentials');
      setTestCredentials(response.data);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  // Mark message as processed
  const markAsProcessedAPI = async (messageId: string) => {
    try {
      await api.patch(`/whatsapp/messages/${messageId}/process`, {});
      markAsProcessed(messageId);
    } catch (error) {
      console.error('Error marking message as processed:', error);
    }
  };

  // Clear messages on backend
  const clearMessagesAPI = async () => {
    try {
      await api.delete('/whatsapp/messages');
      setMessages([]);
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchCredentials();
    fetchMessages();
    
    // Set up polling for new messages when listening
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  // Simulate receiving WhatsApp messages for testing
  const simulateIncomingMessage = async () => {
    const testPayload = {
      object: "whatsapp_business_account",
      entry: [{
        id: testCredentials.businessAccountId,
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: testCredentials.phoneNumberId,
              phone_number_id: testCredentials.phoneNumberId
            },
            contacts: [{
              profile: {
                name: `Test User ${Math.floor(Math.random() * 100)}`
              },
              wa_id: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`
            }],
            messages: [{
              from: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
              id: `wamid.${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: `Test message ${Math.floor(Math.random() * 1000)}`
              },
              type: "text"
            }]
          },
          field: "messages"
        }]
      }]
    };

    try {
      await api.post('/whatsapp/simulate-message', testPayload);
      // Refresh messages after simulation
      fetchMessages();
    } catch (error) {
      console.error('Error simulating message:', error);
    }
  };

  const markAsProcessed = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, processed: true } : msg
    ));
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">WhatsApp Testing Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">
                Monitor and test WhatsApp webhook payloads
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setIsListening(!isListening)}
                variant={isListening ? "secondary" : "primary"}
              >
                {isListening ? "⏸️ Stop Listening" : "🎧 Start Listening"}
              </Button>
              <Button onClick={simulateIncomingMessage} variant="secondary">
                📨 Simulate Message
              </Button>
              <Button onClick={clearMessagesAPI} variant="danger">
                🗑️ Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Test Credentials</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Phone Number ID:</span>
              <span className="ml-2 text-gray-600">{testCredentials.phoneNumberId}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Business Account ID:</span>
              <span className="ml-2 text-gray-600">{testCredentials.businessAccountId}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-900">
              Status: {isListening ? 'Listening for webhook events' : 'Not listening'}
            </span>
          </div>
        </div>

        {/* Messages List */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Received Messages ({messages.length})
          </h3>
          
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📱</div>
              <p>No messages received yet</p>
              <p className="text-sm mt-2">Click "Simulate Message" to test the webhook</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Message Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-900">
                          From: {message.from}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          message.processed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {message.processed ? 'Processed' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {!message.processed && (
                          <Button
                            onClick={() => markAsProcessedAPI(message.id)}
                            variant="secondary"
                            size="sm"
                          >
                            Mark Processed
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="px-4 py-3">
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Message: </span>
                      <span className="text-sm text-gray-900">{message.message}</span>
                    </div>
                    
                    {/* Raw JSON Payload */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Raw JSON Payload:</span>
                      </div>
                      <div className="bg-gray-900 text-green-400 p-3 rounded-md overflow-x-auto">
                        <pre className="text-xs">
                          {formatJson(message.rawPayload)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
