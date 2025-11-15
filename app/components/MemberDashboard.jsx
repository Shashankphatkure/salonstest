'use client';

import { useState, useEffect } from 'react';

const MemberDashboard = ({ activePlan = 'gold' }) => {
  // Mock data for demonstration
  const [memberData, setMemberData] = useState({
    name: 'Amit Kumar',
    plan: activePlan,
    joinDate: '2023-10-15',
    currentPoints: 14500,
    totalSaved: 23750,
    familyMembers: [
      { id: 1, name: 'Sunita Kumar', relationship: 'Spouse' },
      { id: 2, name: 'Rahul Kumar', relationship: 'Son' },
    ],
    transactions: [
      { id: 1, date: '2024-07-02', service: 'Hair Cut & Style', amount: 5000, pointsUsed: 3000, amountPaid: 2000, saved: 3000 },
      { id: 2, date: '2024-06-15', service: 'Hair Color', amount: 4000, pointsUsed: 0, amountPaid: 4000, saved: 0 },
      { id: 3, date: '2024-05-20', service: 'Facial & Clean-up', amount: 3500, pointsUsed: 1500, amountPaid: 2000, saved: 1500 },
      { id: 4, date: '2024-04-10', service: 'Manicure & Pedicure', amount: 2500, pointsUsed: 1000, amountPaid: 1500, saved: 1000 },
    ],
    bonusHistory: [
      { id: 1, date: '2024-07-01', description: 'Monthly Bonus', points: 1000 },
      { id: 2, date: '2024-06-15', description: 'Referral Bonus (Priya Sharma)', points: 500 },
      { id: 3, date: '2024-06-01', description: 'Monthly Bonus', points: 1000 },
      { id: 4, date: '2024-05-01', description: 'Monthly Bonus', points: 1000 },
    ]
  });

  const [activeTab, setActiveTab] = useState('transactions');
  const [newMember, setNewMember] = useState({ name: '', relationship: '' });
  const [timeToNextBonus, setTimeToNextBonus] = useState({ days: 0, hours: 0 });
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Calculate time to next bonus
  useEffect(() => {
    // Simulate time to next bonus
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const diff = nextMonth - today;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    setTimeToNextBonus({ days, hours });
  }, []);

  const handleDeleteMember = (id) => {
    if (confirmDelete === id) {
      setMemberData({
        ...memberData,
        familyMembers: memberData.familyMembers.filter(member => member.id !== id)
      });
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const handleAddMember = () => {
    if (newMember.name && newMember.relationship) {
      setMemberData({
        ...memberData,
        familyMembers: [
          ...memberData.familyMembers,
          {
            id: memberData.familyMembers.length + 10, // Just a simple ID generation
            name: newMember.name,
            relationship: newMember.relationship
          }
        ]
      });
      setNewMember({ name: '', relationship: '' });
    }
  };

  const planColors = {
    gold: 'bg-amber-500',
    silverPlus: 'bg-purple-600',
    silver: 'bg-gray-500'
  };
  
  const planDetails = {
    gold: {
      name: 'Gold',
      monthlyBonus: 1000,
      initialCredit: 12500,
      firstServiceDiscount: '50%',
      color: 'text-amber-600 dark:text-amber-300',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20'
    },
    silverPlus: {
      name: 'Silver Plus',
      monthlyBonus: 500,
      initialCredit: 7500,
      firstServiceDiscount: '35%',
      color: 'text-purple-600 dark:text-purple-300',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    silver: {
      name: 'Silver',
      monthlyBonus: 250,
      initialCredit: 0,
      firstServiceDiscount: '20%',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-700'
    }
  };

  const currentPlan = planDetails[activePlan] || planDetails.gold;

  return (
    <div className="space-y-8 py-6">
      {/* Member Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="flex-shrink-0">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${planColors[activePlan]}`}>
                {memberData.name.charAt(0)}
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{memberData.name}</h2>
              <div className="flex items-center mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentPlan.bgColor} ${currentPlan.color}`}>
                  {currentPlan.name} Member
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-3">
                  Since {new Date(memberData.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center min-w-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Points Balance</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {memberData.currentPoints.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center min-w-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Saved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₹{memberData.totalSaved.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Benefits */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
            Your Monthly Benefits
          </h3>
          <div className="text-gray-600 dark:text-gray-300">
            <p>You receive <span className="font-semibold">{currentPlan.monthlyBonus} points</span> every month.</p>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Next bonus in: {timeToNextBonus.days} days and {timeToNextBonus.hours} hours</p>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'transactions' 
                  ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Transactions
            </button>
            <button 
              onClick={() => setActiveTab('family')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'family' 
                  ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Family Members
            </button>
            <button 
              onClick={() => setActiveTab('bonus')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'bonus' 
                  ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Bonus History
            </button>
          </nav>
        </div>
        
        {/* Transactions Tab Content */}
        {activeTab === 'transactions' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Recent Transactions</h3>
              <button className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saved</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {memberData.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
                        {transaction.service}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        ₹{transaction.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {transaction.pointsUsed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        ₹{transaction.amountPaid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                        ₹{transaction.saved}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Family Members Tab Content */}
        {activeTab === 'family' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                Your Family Members & Friends
              </h3>
              {activePlan === 'gold' ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Unlimited members allowed
                </span>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {memberData.familyMembers.length} / {activePlan === 'silverPlus' ? 5 : 3} members added
                </span>
              )}
            </div>
            <div className="mb-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Relationship</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {memberData.familyMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {member.relationship}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 mr-3">
                            Edit
                          </button>
                          <button 
                            className={`${
                              confirmDelete === member.id 
                                ? 'text-red-700 dark:text-red-500' 
                                : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                            }`}
                            onClick={() => handleDeleteMember(member.id)}
                          >
                            {confirmDelete === member.id ? 'Confirm Delete?' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {memberData.familyMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No family members or friends added yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bonus History Tab Content */}
        {activeTab === 'bonus' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Points History</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-purple-600 dark:text-purple-400">{currentPlan.monthlyBonus}</span> points per month
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {memberData.bonusHistory.map((bonus) => (
                    <tr key={bonus.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(bonus.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
                        {bonus.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                        +{bonus.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Add New Member Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          Add Family Member or Friend
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter full name"
              value={newMember.name}
              onChange={(e) => setNewMember({...newMember, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Relationship
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              value={newMember.relationship}
              onChange={(e) => setNewMember({...newMember, relationship: e.target.value})}
            >
              <option value="">Select relationship</option>
              <option value="Spouse">Spouse</option>
              <option value="Child">Child</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            className={`px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg ${
              (!newMember.name || !newMember.relationship) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleAddMember}
            disabled={!newMember.name || !newMember.relationship}
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard; 