import React from 'react';
import { Shield, EyeOff, Database, Trash2, Camera, Mic, UserCheck, Globe, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface NutritionLabelProps {
  data: {
    opt_out_available?: string;
    data_sharing?: string;
    data_retention?: string;
    can_user_request_deletion?: string;
    third_party_sharing?: string;
    data_broker_sharing?: string;
    cross_device_tracking?: string;
    collection_purpose?: string;
    microphone_access?: string;
    camera_access?: string;
  };
}

const NutritionLabel: React.FC<NutritionLabelProps> = ({ data }) => {
  // Helper to color code Yes/No/Partial based on typical privacy risk
  const getStatusColor = (value: string | undefined) => {
    const v = value?.toLowerCase() || '';
    if (v.includes('yes')) return 'text-red-400'; 
    if (v.includes('no')) return 'text-green-400';
    if (v.includes('partial')) return 'text-yellow-400';
    return 'text-gray-400';
  };

  // Logic for specific fields where 'Yes' is a positive user right
  const getPositiveStatusColor = (value: string | undefined) => {
    const v = value?.toLowerCase() || '';
    if (v.includes('yes')) return 'text-green-400';
    if (v.includes('no')) return 'text-red-400';
    if (v.includes('partial')) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const Row = ({ icon: Icon, label, value, isPositive = false }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-3 text-gray-300">
        <Icon size={16} className="text-blue-400 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-bold text-right ml-4 ${isPositive ? getPositiveStatusColor(value) : getStatusColor(value)}`}>
        {value || 'Not Specified'}
      </span>
    </div>
  );

  return (
    <Card className="bg-black/40 border-2 border-white/10 rounded-none overflow-hidden max-w-md mx-auto font-sans shadow-2xl">
      <div className="bg-white text-black p-4 text-center">
        <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter">Privacy Facts</h2>
        <div className="h-1 bg-black mt-1" />
        <p className="text-[10px] font-bold mt-1 uppercase tracking-widest">Digital Nutrition Label</p>
      </div>
      
      <CardContent className="p-4 space-y-1">
        <div className="text-[10px] font-bold uppercase text-gray-500 mb-2 tracking-widest border-b border-gray-700 pb-1">Data Access & Tracking</div>
        <Row icon={Camera} label="Camera Access" value={data.camera_access} />
        <Row icon={Mic} label="Microphone Access" value={data.microphone_access} />
        <Row icon={Globe} label="Cross-device Tracking" value={data.cross_device_tracking} />
        
        <div className="text-[10px] font-bold uppercase text-gray-500 mt-6 mb-2 tracking-widest border-b border-gray-700 pb-1">Data Sharing</div>
        <Row icon={Database} label="General Sharing" value={data.data_sharing} />
        <Row icon={Shield} label="Third-party Sharing" value={data.third_party_sharing} />
        <Row icon={EyeOff} label="Data Brokers" value={data.data_broker_sharing} />

        <div className="text-[10px] font-bold uppercase text-gray-500 mt-6 mb-2 tracking-widest border-b border-gray-700 pb-1">User Control</div>
        <Row icon={UserCheck} label="Opt-out Available" value={data.opt_out_available} isPositive={true} />
        <Row icon={Trash2} label="Request Deletion" value={data.can_user_request_deletion} isPositive={true} />

        <div className="mt-6 pt-4 border-t-4 border-black">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-start">
              <Clock size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Retention Period</span>
                <span className="text-xs text-white leading-tight italic">
                  {data.data_retention && data.data_retention !== "Not Specified" ? data.data_retention : "Refer to document for specific timelines."}
                </span>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <Target size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Collection Purpose</span>
                <span className="text-xs text-white leading-tight font-medium">
                  {data.collection_purpose || 'General service improvement and operation.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NutritionLabel;