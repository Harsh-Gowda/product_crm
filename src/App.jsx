import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';
import {
  LayoutGrid,
  Package,
  Users,
  Settings,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Tag,
  Hash,
  HelpCircle
} from 'lucide-react';

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'suppliers', icon: Users, label: 'Suppliers' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <Package size={24} className="logo-icon" />
        <span>Magnific CRM</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Wall Lights', 'Chandeliers', 'Table Lamps', 'Floor Lamps', 'Surface', 'Pendant Light']);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [templates, setTemplates] = useState([]);

  // Add Product State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    templateId: '',
    sku: '',
    name: '',
    brand: 'Magnific',
    model_number: '',
    category: 'Wall Lights',
    mrp: '',
    showroom_price: '',
    images: [],
    technical_details_arr: []
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    
    // Fetch Templates
    const { data: temp_data, error: temp_error } = await supabase
      .from('product_templates')
      .select('templateId, name, skuFamily');
      
    if (!temp_error && temp_data) {
      setTemplates(temp_data);
    }

    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      const mappedData = data.map(p => ({
        id: p.variantId,
        variantId: p.variantId,
        templateId: p.templateId,
        sku: p.sku || '',
        name: p.variantName || '',
        mrp: p.catalogPrice || 0,
        showroom_price: p.showroomPrice || 0,
        is_reviewed: p.isSellable || false,
        brand: p.attributes?.brand || 'Magnific',
        category: p.attributes?.category || 'Wall Lights',
        model_number: p.attributes?.model_number || '',
        images: p.attributes?.media?.images || p.attributes?.images || [],
        technical_details: p.attributes?.technicalDetails || p.attributes?.technical_details || {},
        original_attributes: p.attributes || {}
      }));
      setProducts(mappedData);
      const dbCategories = [...new Set(mappedData.map(p => p.category).filter(Boolean))];
      const baseCategories = ['Wall Lights', 'Chandeliers', 'Table Lamps', 'Floor Lamps', 'Surface', 'Pendant Light', 'Spot Light', 'Magnetic Track'];
      const uniqueCategories = [...new Set([...baseCategories, ...dbCategories])].sort();
      setCategories(uniqueCategories);
    }
    setLoading(false);
  };

  const handleToggleExpand = (product) => {
    if (expandedId === product.id) {
      setExpandedId(null);
      setEditFormData(null);
    } else {
      setExpandedId(product.id);
      const techArr = Object.entries(product.technical_details || {})
        .filter(([key]) => key !== 'raw_text')
        .map(([key, value], idx) => ({
          id: `tech-${Date.now()}-${idx}`,
          key,
          value
        }));
      setEditFormData({ ...product, technical_details_arr: techArr });
    }
  };

  const handleInputChange = (e, isNew = false) => {
    const { name, value } = e.target;
    if (isNew) {
      setNewProduct(prev => ({ ...prev, [name]: value }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTechUpdate = (id, field, value, isNew = false) => {
    const setTarget = isNew ? setNewProduct : setEditFormData;
    setTarget(prev => ({
      ...prev,
      technical_details_arr: prev.technical_details_arr.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addTechField = (isNew = false) => {
    const newItem = { id: `tech-${Date.now()}`, key: '', value: '' };
    const setTarget = isNew ? setNewProduct : setEditFormData;
    setTarget(prev => ({
      ...prev,
      technical_details_arr: [...prev.technical_details_arr, newItem]
    }));
  };

  const removeTechField = (id, isNew = false) => {
    const setTarget = isNew ? setNewProduct : setEditFormData;
    setTarget(prev => ({
      ...prev,
      technical_details_arr: prev.technical_details_arr.filter(item => item.id !== id)
    }));
  };

  const techArrToObject = (arr) => {
    return (arr || []).reduce((acc, item) => {
      if (item.key.trim()) {
        acc[item.key] = item.value;
      }
      return acc;
    }, {});
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    const filename = imagePath.split('/').pop();
    return `/products/${filename}`;
  };

  const handleSave = async () => {
    if (!editFormData) return;
    setSaving(true);
    const finalTech = techArrToObject(editFormData.technical_details_arr);
    
    const finalPayload = {
      sku: editFormData.sku,
      variantName: editFormData.name,
      catalogPrice: editFormData.mrp ? parseFloat(editFormData.mrp) : 0,
      showroomPrice: editFormData.showroom_price ? parseFloat(editFormData.showroom_price) : 0,
      isSellable: editFormData.is_reviewed !== undefined ? editFormData.is_reviewed : true,
      updatedAt: new Date().toISOString(),
      attributes: {
        ...(editFormData.original_attributes || {}),
        brand: editFormData.brand,
        category: editFormData.category,
        model_number: editFormData.model_number,
        media: {
          ...(editFormData.original_attributes?.media || {}),
          images: editFormData.images
        },
        technicalDetails: finalTech
      }
    };

    const { error } = await supabase
      .from('product_variants')
      .update(finalPayload)
      .eq('variantId', editFormData.variantId);

    if (error) {
      alert('Error saving product: ' + error.message);
    } else {
      setProducts(prev => prev.map(p =>
        p.id === editFormData.id ? { ...p, ...editFormData, technical_details: finalTech } : p
      ));
      setExpandedId(null);
    }
    setSaving(false);
  };

  const handleAddProduct = async () => {
    if (!newProduct.sku || !newProduct.name) {
      alert('SKU and Name are required');
      return;
    }
    if (!newProduct.templateId) {
      alert('Please select a Product Template');
      return;
    }

    setSaving(true);
    const templateIdStr = newProduct.templateId;
    const finalTech = techArrToObject(newProduct.technical_details_arr);
    
    const finalPayload = {
      variantId: crypto.randomUUID(),
      templateId: templateIdStr,
      sku: newProduct.sku,
      variantName: newProduct.name,
      catalogPrice: newProduct.mrp ? parseFloat(newProduct.mrp) : 0,
      showroomPrice: newProduct.showroom_price ? parseFloat(newProduct.showroom_price) : 0,
      isSellable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attributes: {
        brand: newProduct.brand,
        category: newProduct.category,
        model_number: newProduct.model_number,
        media: {
          images: newProduct.images
        },
        technicalDetails: finalTech
      }
    };

    const { data, error } = await supabase
      .from('product_variants')
      .insert([finalPayload])
      .select();

    if (error) {
      alert('Error adding product: ' + error.message);
    } else {
      if (data && data[0]) {
        const p = data[0];
        setProducts(prev => [{
          id: p.variantId,
          variantId: p.variantId,
          templateId: p.templateId,
          sku: p.sku || '',
          name: p.variantName || '',
          mrp: p.catalogPrice || 0,
          showroom_price: p.showroomPrice || 0,
          is_reviewed: p.isSellable || false,
          brand: p.attributes?.brand || 'Magnific',
          category: p.attributes?.category || 'Wall Lights',
          model_number: p.attributes?.model_number || '',
          images: p.attributes?.images || [],
          technical_details: p.attributes?.technical_details || {}
        }, ...prev]);
      }
      setNewProduct({
        templateId: '', sku: '', name: '', brand: 'Magnific', model_number: '', category: 'Wall Lights',
        mrp: '', showroom_price: '', images: [], technical_details_arr: []
      });
      setShowAddForm(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setSaving(true);
    const { error } = await supabase.from('product_variants').delete().eq('variantId', id);
    if (error) alert('Error deleting product: ' + error.message);
    else {
      setProducts(prev => prev.filter(p => p.id !== id));
      setExpandedId(null);
    }
    setSaving(false);
  };

  const handleToggleReviewed = async (product) => {
    const newValue = !product.is_reviewed;
    const { error } = await supabase.from('product_variants').update({ isSellable: newValue }).eq('variantId', product.variantId);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_reviewed: newValue } : p));
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content-page">
      <header className="page-header">
        <div className="header-title">
          <h1>Products</h1>
          <p className="subtitle">{products.length} total products in catalog</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by SKU, name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="help-icon-btn" onClick={() => setShowHelp(!showHelp)} title="How to add images?">
            <HelpCircle size={20} />
          </button>
          <button className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            <span>{showAddForm ? 'Cancel' : 'Add Product'}</span>
          </button>
        </div>
      </header>

      {showHelp && (
        <div className="help-banner">
          <div className="help-content">
            <h3>🖼️ How to Add Product Images</h3>
            <ol>
              <li>Copy your image files (JPG, PNG, WEBP) into the <code>public/products/</code> folder.</li>
              <li>When adding or editing a product, type the exact filename (e.g., <code>light_1.jpg</code>) into the <b>Image Filename</b> field.</li>
              <li>The CRM will automatically link that filename to your local image!</li>
            </ol>
          </div>
          <button className="close-help" onClick={() => setShowHelp(false)}><X size={16} /></button>
        </div>
      )}

      {showAddForm && (
        <div className="add-panel-container">
          <div className="inline-edit-panel add-panel">
            <div className="edit-grid">
              <div className="edit-section media-section">
                <h3>1. Media Preview</h3>
                <div className="edit-image-preview">
                  {newProduct.images?.[0] ? (
                    <img src={getImageUrl(newProduct.images[0])} alt="Preview" />
                  ) : (
                    <div className="no-image-large"><ImageIcon size={48} /><span>No Image</span></div>
                  )}
                </div>
                <div className="input-group">
                  <label><ImageIcon size={12} /> Image Filename</label>
                  <input
                    type="text"
                    placeholder="e.g. light_1.jpg"
                    value={newProduct.images?.[0] || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, images: [e.target.value] })}
                  />
                </div>
              </div>

              <div className="edit-section">
                <h3>2. Basic Information</h3>
                <div className="input-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="input-group">
                    <label>Template (Required)</label>
                    <select name="templateId" value={newProduct.templateId} onChange={(e) => handleInputChange(e, true)}>
                      <option value="">Select a template</option>
                      {templates.map(t => (
                        <option key={t.templateId} value={t.templateId}>{t.name || t.skuFamily}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group"><label><Tag size={12} /> SKU (Required)</label><input name="sku" value={newProduct.sku} onChange={(e) => handleInputChange(e, true)} placeholder="e.g. MAG-MWL-123" /></div>
                  <div className="input-group"><label>Product Name</label><input name="name" value={newProduct.name} onChange={(e) => handleInputChange(e, true)} placeholder="e.g. Wall Light Modern" /></div>
                  <div className="input-group"><label>Brand</label><input name="brand" value={newProduct.brand} onChange={(e) => handleInputChange(e, true)} /></div>
                  <div className="input-group"><label><Hash size={12} /> Model Number</label><input name="model_number" value={newProduct.model_number} onChange={(e) => handleInputChange(e, true)} /></div>
                  <div className="input-group"><label>Category</label>
                    <select name="category" value={newProduct.category} onChange={(e) => handleInputChange(e, true)}>
                      {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="edit-section">
                <h3>3. Pricing</h3>
                <div className="price-inputs" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="input-group"><label>MRP (₹)</label><input type="number" name="mrp" value={newProduct.mrp} onChange={(e) => handleInputChange(e, true)} /></div>
                  <div className="input-group"><label>Showroom Price (₹)</label><input type="number" name="showroom_price" value={newProduct.showroom_price} onChange={(e) => handleInputChange(e, true)} /></div>
                </div>
              </div>

              <div className="edit-section full-width-section">
                <div className="section-header"><h3>3. Technical Details</h3><button className="btn-add-sm" onClick={() => addTechField(true)}>+ Add Specification</button></div>
                <div className="tech-inline">
                  {newProduct.technical_details_arr.map((item) => (
                    <div key={item.id} className="tech-row-inline">
                      <input className="tech-input key" value={item.key} placeholder="Key" onChange={(e) => handleTechUpdate(item.id, 'key', e.target.value, true)} />
                      <input className="tech-input" value={item.value} placeholder="Value" onChange={(e) => handleTechUpdate(item.id, 'value', e.target.value, true)} />
                      <button className="btn-icon-sm" onClick={() => removeTechField(item.id, true)}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="edit-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Discard</button>
              <button className="btn btn-primary" onClick={handleAddProduct} disabled={saving}><Plus size={16} /><span>{saving ? 'Creating...' : 'Create Product'}</span></button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading products...</div>
        ) : (
          <table className="product-table">
            <thead>
              <tr><th className="checkbox-cell">Done</th><th style={{ width: '60px' }}>Image</th><th>Product Information</th><th style={{ width: '150px' }}>Price</th><th style={{ width: '100px' }}>Actions</th></tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                  <tr className={`${expandedId === product.id ? 'active-row' : ''} ${product.is_reviewed ? 'reviewed-row' : ''}`} onClick={() => handleToggleExpand(product)}>
                    <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={product.is_reviewed || false} onChange={() => handleToggleReviewed(product)} /></td>
                    <td>
                      <div className="product-thumb">
                        {product.images?.[0] ? (<img src={getImageUrl(product.images[0])} alt={product.name} />) : (<div className="no-image"><Package size={16} /></div>)}
                      </div>
                    </td>
                    <td><div className="product-info"><div className="product-name">{product.name}</div><div className="product-brand">{product.brand || ''} {product.model_number || ''}</div></div></td>
                    <td><div className="price-tag">₹{product.showroom_price?.toLocaleString() || 0}</div></td>
                    <td className="actions-cell">
                      <button className="icon-btn">{expandedId === product.id ? <ChevronUp size={18} /> : <Edit2 size={16} />}</button>
                      <button className="icon-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}><Trash2 size={16} /></button>
                    </td>
                  </tr>

                  {expandedId === product.id && (
                    <tr className="detail-row">
                      <td colSpan="5">
                        <div className="inline-edit-panel">
                          <div className="edit-grid">
                            <div className="edit-section media-section">
                              <h3>Media Preview</h3>
                              <div className="edit-image-preview">
                                {editFormData.images?.[0] ? (
                                  <img src={getImageUrl(editFormData.images[0])} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <div className="no-image-large"><ImageIcon size={48} /><span>No Image</span></div>
                                )}
                              </div>
                              <div className="input-group">
                                <label><ImageIcon size={12} /> Image Filename</label>
                                <input
                                  type="text"
                                  placeholder="e.g. light_1.jpg"
                                  value={editFormData.images?.[0] || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, images: [e.target.value] })}
                                />
                              </div>
                            </div>

                            <div className="edit-section">
                              <h3>Core Information</h3>
                              <div className="input-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="input-group"><label><Tag size={12} /> SKU</label><input name="sku" value={editFormData.sku || ''} onChange={handleInputChange} /></div>
                                <div className="input-group"><label>Product Name</label><input name="name" value={editFormData.name || ''} onChange={handleInputChange} /></div>
                                <div className="input-group"><label>Brand</label><input name="brand" value={editFormData.brand || ''} onChange={handleInputChange} /></div>
                                <div className="input-group"><label><Hash size={12} /> Model Number</label><input name="model_number" value={editFormData.model_number || ''} onChange={handleInputChange} /></div>
                                <div className="input-group">
                                  <label>Category</label>
                                  <select name="category" value={editFormData.category || ''} onChange={handleInputChange}>
                                    {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="edit-section">
                              <h3>Pricing</h3>
                              <div className="price-inputs" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="input-group"><label>MRP (₹)</label><input type="number" name="mrp" value={editFormData.mrp || ''} onChange={handleInputChange} /></div>
                                <div className="input-group"><label>Showroom Price (₹)</label><input type="number" name="showroom_price" value={editFormData.showroom_price || ''} onChange={handleInputChange} /></div>
                              </div>
                            </div>

                            <div className="edit-section full-width-section">
                              <div className="section-header"><h3>Technical Details</h3><button className="btn-add-sm" onClick={() => addTechField(false)}>+ Add Field</button></div>
                              <div className="tech-inline">
                                {editFormData.technical_details_arr.map((item) => (
                                  <div key={item.id} className="tech-row-inline">
                                    <input className="tech-input key" value={item.key} placeholder="Key" onChange={(e) => handleTechUpdate(item.id, 'key', e.target.value, false)} />
                                    <input className="tech-input" value={item.value} placeholder="Value" onChange={(e) => handleTechUpdate(item.id, 'value', e.target.value, false)} />
                                    <button className="btn-icon-sm" onClick={() => removeTechField(item.id, false)}><X size={14} /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="edit-actions">
                            <button className="btn btn-secondary" onClick={() => setExpandedId(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /><span>{saving ? 'Saving...' : 'Save Changes'}</span></button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('products');

  // Check if Supabase is configured
  const isSupabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '2rem',
        textAlign: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <Package size={48} style={{ color: '#3b82f6', marginBottom: '1rem' }} />
          <h1 style={{ marginBottom: '1rem' }}>Configuration Required</h1>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '400px' }}>
            The Supabase environment variables are missing. Please add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your deployment settings.
          </p>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', textAlign: 'left', fontSize: '0.9rem' }}>
            <p style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>Next Steps:</p>
            <ol style={{ paddingLeft: '1.2rem', color: '#cbd5e1' }}>
              <li>Go to Vercel Project Settings</li>
              <li>Add the Environment Variables</li>
              <li>Redeploy the project</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-viewport full-width">
        {activeTab === 'products' ? <ProductList /> : <div className="coming-soon">Content for {activeTab} coming soon!</div>}
      </main>
    </div>
  );
}

export default App;
