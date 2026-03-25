import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';

const OperationPickerPage: React.FC = () => {
  const { operations, switchOperation } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (opId: string) => {
    await switchOperation(opId);
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-12 font-inter">
      <div className="max-w-[400px] mx-auto">
        <div className="text-center mb-8">
          <h1 style={{ color: '#0E2646', fontSize: 20, fontWeight: 700 }}>Select Operation</h1>
          <p style={{ color: '#717182', fontSize: 14, marginTop: 4 }}>Choose which operation to work in</p>
        </div>

        <div className="space-y-3">
          {operations.map((op) => (
            <button
              key={op.id}
              onClick={() => handleSelect(op.id)}
              className="w-full flex items-center border border-[#E8E4DC] rounded-2xl p-4 text-left"
              style={{ background: 'white', cursor: 'pointer' }}
            >
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 40, height: 40,
                  background: 'linear-gradient(135deg, #0E2646, #55BAAA)',
                  color: 'white', fontWeight: 800, fontSize: 14,
                }}
              >
                {getInitials(op.name)}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div style={{ color: '#0E2646', fontSize: 16, fontWeight: 700 }} className="truncate">{op.name}</div>
                <div style={{ color: '#717182', fontSize: 13 }} className="truncate capitalize">{op.operation_type.replace('_', ' ')}</div>
              </div>
              <ChevronRight size={20} style={{ color: '#717182' }} />
            </button>
          ))}

          <button
            onClick={() => navigate('/onboarding')}
            className="w-full flex items-center justify-center rounded-2xl p-4"
            style={{ border: '2px dashed #55BAAA', background: 'transparent', cursor: 'pointer', color: '#55BAAA', fontSize: 15, fontWeight: 600 }}
          >
            <span style={{ fontSize: 20, marginRight: 8 }}>+</span>
            Create New Operation
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationPickerPage;
