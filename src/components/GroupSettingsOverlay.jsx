import {  BellOff, UserMinus } from 'lucide-react';

export const GroupSettingsOverlay = ({ members, isAdmin, onKick, onClose }) => {
    return (
        <div className="absolute right-4 top-16 w-64 bg-white border shadow-2xl rounded-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Group Settings</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
                {/* Generic Actions */}
                <button className="w-full text-left text-sm py-2 px-3 hover:bg-gray-50 rounded flex items-center gap-2">
                    <BellOff size={16} /> Mute Notifications
                </button>

                <hr />

                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</h4>
                    <div className="max-h-60 overflow-y-auto">
                        {members.map(member => (
                            <div key={member.id} className="flex justify-between items-center py-2 group">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{member.username}</span>
                                    {member.admin && <span className="text-[10px] text-blue-500 font-bold uppercase">Admin</span>}
                                </div>

                                {/* ONLY show kick button if I am Admin AND the person isn't me */}
                                {isAdmin && !member.admin && (
                                    <button 
                                        onClick={() => onKick(member.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition"
                                        title="Kick User"
                                    >
                                        <UserMinus size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button className="w-full text-left text-sm py-2 px-3 text-red-600 hover:bg-red-50 rounded font-medium">
                    Leave Group
                </button>
            </div>
        </div>
    );
};