'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  unit_price?: number;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onAddNew: (name: string, additionalData?: any) => Promise<Option>;
  placeholder?: string;
  addNewLabel?: string;
  entityType: 'customer' | 'supplier' | 'product';
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = "Search or add new...",
  addNewLabel = "+ Add New",
  entityType
}: SearchableSelectProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setIsCreating(false);
        setNewItemName('');
        setAdditionalData({});
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option: Option): void => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddNewClick = (): void => {
    setIsCreating(true);
    setNewItemName(searchTerm);
    
    if (entityType === 'product') {
      setAdditionalData({ unit_price: 0 });
    }
  };

  const handleAdditionalDataChange = (field: string, val: any): void => {
    setAdditionalData({ ...additionalData, [field]: val });
  };

  const handleAddNewConfirm = async (): Promise<void> => {
    if (!newItemName.trim()) {
      return;
    }
    
    try {
      let newItem: Option;
      
      if (entityType === 'product') {
        if (!additionalData.unit_price || additionalData.unit_price <= 0) {
          alert('Please enter a valid selling price');
          return;
        }
        newItem = await onAddNew(newItemName.trim(), { unit_price: additionalData.unit_price });
      } else {
        newItem = await onAddNew(newItemName.trim());
      }
      
      if (newItem && newItem.id) {
        onChange(newItem.id);
        setIsOpen(false);
        setSearchTerm('');
        setNewItemName('');
        setAdditionalData({});
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error adding new item:', error);
    }
  };

  const handleCancelAdd = (): void => {
    setIsCreating(false);
    setNewItemName('');
    setAdditionalData({});
  };

  const getEntityLabel = (): string => {
    switch (entityType) {
      case 'customer': return 'Customer';
      case 'supplier': return 'Supplier';
      case 'product': return 'Product';
      default: return 'Item';
    }
  };

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <div 
        className="select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? '' : 'placeholder'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="select-dropdown">
          {!isCreating ? (
            <>
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              
              <div className="options-list">
                {filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`option ${option.id === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="option-name">{option.name}</div>
                    {option.email && <div className="option-detail">{option.email}</div>}
                    {option.unit_price !== undefined && (
                      <div className="option-detail">₦{option.unit_price.toLocaleString()}</div>
                    )}
                  </div>
                ))}
                
                {filteredOptions.length === 0 && searchTerm && (
                  <div className="no-options">
                    <div className="add-new-option">
                      <div className="add-new-text">"{searchTerm}" not found</div>
                      <button 
                        className="add-new-btn"
                        onClick={handleAddNewClick}
                      >
                        {addNewLabel}
                      </button>
                    </div>
                  </div>
                )}
                
                {filteredOptions.length === 0 && !searchTerm && (
                  <div className="no-results">No options available</div>
                )}
              </div>
            </>
          ) : (
            <div className="creating-mode">
              <div className="creating-header">
                Add New {getEntityLabel()}
              </div>
              <input
                type="text"
                className="new-item-input"
                placeholder={`Enter ${getEntityLabel().toLowerCase()} name...`}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewConfirm()}
                autoFocus
              />
              
              {entityType === 'product' && (
                <div className="additional-fields">
                  <div className="form-field">
                    <label>Selling Price (₦) *</label>
                    <input
                      type="number"
                      value={additionalData.unit_price || ''}
                      onChange={(e) => handleAdditionalDataChange('unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="Enter selling price"
                      step="100"
                      min="0"
                    />
                  </div>
                </div>
              )}
              
              <div className="creating-actions">
                <button className="cancel-btn" onClick={handleCancelAdd}>
                  Cancel
                </button>
                <button 
                  className="confirm-btn" 
                  onClick={handleAddNewConfirm}
                  disabled={!newItemName.trim() || (entityType === 'product' && (!additionalData.unit_price || additionalData.unit_price <= 0))}
                >
                  Add {getEntityLabel()}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .searchable-select {
          position: relative;
          width: 100%;
        }
        
        .select-trigger {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          padding: 0.75rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-primary);
        }
        
        .select-trigger:hover {
          border-color: var(--success);
        }
        
        .select-trigger .placeholder {
          color: var(--text-muted);
        }
        
        .arrow {
          color: var(--text-muted);
          font-size: 0.75rem;
        }
        
        .select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-top: 4px;
          z-index: 1000;
          box-shadow: var(--shadow-lg);
          max-height: 400px;
          overflow: hidden;
        }
        
        .search-input,
        .new-item-input {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
        }
        
        .search-input:focus,
        .new-item-input:focus {
          border-bottom-color: var(--success);
        }
        
        .options-list {
          max-height: 250px;
          overflow-y: auto;
        }
        
        .option {
          padding: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border-light);
        }
        
        .option:hover {
          background: var(--bg-tertiary);
        }
        
        .option.selected {
          background: var(--success-dim);
        }
        
        .option-name {
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        
        .option-detail {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .no-options {
          padding: 1rem;
          text-align: center;
        }
        
        .add-new-option {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .add-new-text {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        
        .add-new-btn {
          background: var(--success-dim);
          color: var(--success);
          border: none;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        
        .add-new-btn:hover {
          background: var(--success);
          color: white;
        }
        
        .no-results {
          color: var(--text-muted);
          text-align: center;
          padding: 1rem;
        }
        
        .creating-mode {
          padding: 0.75rem;
        }
        
        .creating-header {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }
        
        .additional-fields {
          margin-top: 0.75rem;
        }
        
        .form-field {
          margin-bottom: 0.75rem;
        }
        
        .form-field label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }
        
        .form-field input {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        
        .form-field input:focus {
          outline: none;
          border-color: var(--success);
        }
        
        .creating-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        
        .cancel-btn {
          flex: 1;
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
        }
        
        .confirm-btn {
          flex: 1;
          padding: 0.5rem;
          background: var(--success);
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
        }
        
        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}