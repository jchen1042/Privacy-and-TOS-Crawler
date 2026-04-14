import React from 'react';
import { Shield, EyeOff, Database, Trash2, Camera, Mic, UserCheck, Globe, Clock, Target, HardDrive, Users, MapPin, Fingerprint, Activity, Wifi, UserMinus, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
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
    local_storage_access?: string;
    user_contacts_access?: string;
    location_access?: string;
    biometric_data_access?: string;
    health_data_access?: string;
    data_transmission_frequency?: string;
    account_deletion_allowed?: string;
    internet_required?: string;
    includes_reccurring_charges?: string;
  
  };
}

const NutritionLabel: React.FC<NutritionLabelProps> = ({ data }) => {
  const [expanded, setExpanded] = React.useState({
    access: true,
    sharing: true,
    control: true,
    requirements: true,
    details: true
  });

  // Helper to color code Yes/No/Partial based on typical privacy risk
  const getStatusColor = (value: string | undefined) => {
    const v = value?.toLowerCase() || '';
    if (v === 'not specified' || v === '' || v === 'unknown') return 'text-gray-400';
    
    if (v.includes('yes')) return 'text-red-400'; 
    if (v.includes('no')) return 'text-green-400';
    if (v.includes('partial')) return 'text-yellow-400';
    return 'text-gray-400';
  };

  // Logic for specific fields where 'Yes' is a positive user right
  const getPositiveStatusColor = (value: string | undefined) => {
    const v = value?.toLowerCase() || '';
    if (v === 'not specified' || v === '' || v === 'unknown') return 'text-gray-400';

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
    <Card className="bg-gray-900/40 border border-gray-800 rounded-[2.5rem] overflow-hidden max-w-md mx-auto font-sans shadow-2xl backdrop-blur-md">
      <div className="bg-blue-500/5 border-b border-gray-800 p-6 text-center">
        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Digital Nutrition Facts</h2>
      </div>
      
      <CardContent className="p-6 pt-8 space-y-2">
        <button 
          onClick={() => setExpanded(prev => ({ ...prev, access: !prev.access }))}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 mb-2 tracking-widest border-b border-gray-700 pb-1 hover:text-white transition-colors group outline-none"
        >
          <span>Data Access & Tracking</span>
          {expanded.access ? <ChevronDown size={14} className="opacity-50 group-hover:opacity-100" /> : <ChevronRight size={14} className="opacity-50 group-hover:opacity-100" />}
        </button>
        {expanded.access && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Row icon={Camera} label="Camera Access" value={data.camera_access} />
            <Row icon={Mic} label="Microphone Access" value={data.microphone_access} />
            <Row icon={MapPin} label="Location Access" value={data.location_access} />
            <Row icon={Fingerprint} label="Biometric Access" value={data.biometric_data_access} />
            <Row icon={Activity} label="Health Data Access" value={data.health_data_access} />
            <Row icon={Users} label="Contacts Access" value={data.user_contacts_access} />
            <Row icon={HardDrive} label="Local Storage" value={data.local_storage_access} />
            <Row icon={Globe} label="Cross-device Tracking" value={data.cross_device_tracking} />
            <Row icon={Wifi} label="Transmission" value={data.data_transmission_frequency} />
          </div>
        )}
        
        <button 
          onClick={() => setExpanded(prev => ({ ...prev, sharing: !prev.sharing }))}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 mt-6 mb-2 tracking-widest border-b border-gray-700 pb-1 hover:text-white transition-colors group outline-none"
        >
          <span>Data Sharing</span>
          {expanded.sharing ? <ChevronDown size={14} className="opacity-50 group-hover:opacity-100" /> : <ChevronRight size={14} className="opacity-50 group-hover:opacity-100" />}
        </button>
        {expanded.sharing && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Row icon={Database} label="General Sharing" value={data.data_sharing} />
            <Row icon={Shield} label="Third-party Sharing" value={data.third_party_sharing} />
            <Row icon={EyeOff} label="Data Brokers" value={data.data_broker_sharing} />
          </div>
        )}

        <button 
          onClick={() => setExpanded(prev => ({ ...prev, control: !prev.control }))}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 mt-6 mb-2 tracking-widest border-b border-gray-700 pb-1 hover:text-white transition-colors group outline-none"
        >
          <span>User Control</span>
          {expanded.control ? <ChevronDown size={14} className="opacity-50 group-hover:opacity-100" /> : <ChevronRight size={14} className="opacity-50 group-hover:opacity-100" />}
        </button>
        {expanded.control && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Row icon={UserCheck} label="Opt-out Available" value={data.opt_out_available} isPositive={true} />
            <Row icon={Trash2} label="Request Deletion" value={data.can_user_request_deletion} isPositive={true} />
            <Row icon={UserMinus} label="Account Deletion" value={data.account_deletion_allowed} isPositive={true} />
          </div>
        )}

        <button 
          onClick={() => setExpanded(prev => ({ ...prev, requirements: !prev.requirements }))}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-blue-500/50 mt-6 mb-2 tracking-widest border-b border-gray-800 pb-1 hover:text-white transition-colors group outline-none"
        >
          <span>Service Requirements</span>
          {expanded.requirements ? <ChevronDown size={14} className="opacity-50 group-hover:opacity-100" /> : <ChevronRight size={14} className="opacity-50 group-hover:opacity-100" />}
        </button>
        {expanded.requirements && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Row icon={Globe} label="Internet Required" value={data.internet_required} />
            <Row icon={CreditCard} label="Recurring Charges" value={data.includes_reccurring_charges} />
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-800">
          <button 
            onClick={() => setExpanded(prev => ({ ...prev, details: !prev.details }))}
            className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-blue-500/50 mb-4 tracking-widest hover:text-white transition-colors group outline-none"
          >
            <span>Policy Insights</span>
            {expanded.details ? <ChevronDown size={14} className="opacity-50 group-hover:opacity-100" /> : <ChevronRight size={14} className="opacity-50 group-hover:opacity-100" />}
          </button>
          {expanded.details && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex gap-2 items-start">
              <Clock size={14} className="text-blue-500/70 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-500/50 block">Retention Period</span>
                <span className="text-xs text-white leading-tight italic">
                  {data.data_retention && data.data_retention !== "Not Specified" ? data.data_retention : "Refer to document for specific timelines."}
                </span>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <Target size={14} className="text-blue-500/70 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-500/50 block">Collection Purpose</span>
                <span className="text-xs text-white leading-tight font-medium">
                  {data.collection_purpose || 'General service improvement and operation.'}
                </span>
              </div>
            </div>
            </div>
          )}
          </div>
      </CardContent>
    </Card>
  );
};

export default NutritionLabel;