import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { CMSTestimonial } from '../../types';

export const TestimonialsManager: React.FC = () => {
  const { cmsTestimonials, addTestimonial, updateTestimonial, deleteTestimonial } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CMSTestimonial | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setCustomerName('');
    setText('');
    setRating(5);
    setAvatarUrl('');
    setLocation('');
    setIsActive(true);
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: CMSTestimonial) => {
    setCustomerName(item.customerName);
    setText(item.text);
    setRating(item.rating);
    setAvatarUrl(item.avatarUrl || '');
    setLocation(item.location || '');
    setIsActive(item.isActive);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !text) return;

    if (editingItem) {
      await updateTestimonial(editingItem.id, {
        customerName, text, rating, avatarUrl, location, isActive
      });
    } else {
      const newItem: CMSTestimonial = {
        id: `TEST-${Date.now()}`,
        customerName,
        text,
        rating,
        avatarUrl,
        location,
        isActive,
      };
      await addTestimonial(newItem);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this testimonial?")) {
      await deleteTestimonial(id);
    }
  };

  const filteredItems = cmsTestimonials.filter(t => 
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Testimonials Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage customer reviews and feedback for the homepage.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Testimonial
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px] relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="Search testimonials by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
            {/* Status Indicator */}
            <div className={`absolute top-0 left-0 w-1 h-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt={item.customerName} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                    {item.customerName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{item.customerName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {item.location || 'Unknown Location'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{item.rating.toFixed(1)}</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-4 flex-1 line-clamp-4">
              "{item.text}"
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${item.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                  title="Edit"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-4xl text-slate-400 mb-3">rate_review</span>
            <p className="text-slate-500 font-medium">No testimonials found.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">{editingItem ? 'edit' : 'add_circle'}</span>
                {editingItem ? 'Edit Testimonial' : 'Add New Testimonial'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                    placeholder="e.g. Mumbai, India"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Review Content *</label>
                <textarea
                  required
                  value={text}
                  onChange={e => setText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none"
                  placeholder="The tour was amazing..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rating (1-5)</label>
                  <input
                    type="number"
                    min="1" max="5" step="0.5"
                    value={rating}
                    onChange={e => setRating(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Avatar URL (Optional)</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div>
                  <label htmlFor="isActiveToggle" className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">Active on Homepage</label>
                  <p className="text-xs text-slate-500">Should this testimonial be displayed on the public website?</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {editingItem ? 'Update Testimonial' : 'Save Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
