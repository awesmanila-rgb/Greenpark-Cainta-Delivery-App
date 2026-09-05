import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/friendlyError'
import { compressImage } from '../../lib/compressImage'

const UNIT_OPTIONS = ['piece', 'kilo', 'pack', 'bundle', 'liter', 'order']

export default function ProductForm() {
  const { profile } = useAuth()
  const { id } = useParams() // undefined when adding
  const isEditing = !!id
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('piece')
  const [category, setCategory] = useState('')
  const [stockQty, setStockQty] = useState('0')

  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  useEffect(() => {
    if (!isEditing) return
    async function loadProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        setError(friendlyError(error))
        setLoading(false)
        return
      }
      setName(data.name)
      setDescription(data.description || '')
      setPrice(String(data.price))
      setUnit(data.unit)
      setCategory(data.category || '')
      setStockQty(String(data.stock_qty))
      setExistingPhotoUrl(data.photo_url)
      setLoading(false)
    }
    loadProduct()
  }, [id, isEditing])

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto() {
    const compressed = await compressImage(photoFile)
    const fileName = `${profile.id}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('product-photos')
      .upload(fileName, compressed, { contentType: 'image/jpeg' })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('product-photos').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!name || !price || !unit) {
      setError('Please fill in all required fields.')
      return
    }
    if (Number(price) < 0) {
      setError('Price cannot be negative.')
      return
    }
    if (!photoFile && !existingPhotoUrl) {
      setError('A product photo is required.')
      return
    }

    setSubmitting(true)
    try {
      let photoUrl = existingPhotoUrl
      if (photoFile) {
        photoUrl = await uploadPhoto()
      }

      const payload = {
        merchant_id: profile.id,
        name,
        description: description || null,
        price: Number(price),
        unit,
        category: category || null,
        stock_qty: Number(stockQty) || 0,
        photo_url: photoUrl,
      }

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('products').insert(payload)
        if (insertError) throw insertError
      }

      navigate('/merchant/products')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner">Loading…</div>
      </div>
    )
  }

  const displayPhoto = photoPreview || existingPhotoUrl

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>{isEditing ? 'Edit product' : 'Add product'}</h1>

        <form className="card" onSubmit={handleSubmit}>
          {error && <div className="error-text">{error}</div>}

          <div className="field">
            <label htmlFor="photo">Photo (required)</label>
            {displayPhoto && (
              <img
                src={displayPhoto}
                alt="Product preview"
                style={{
                  width: '100%',
                  maxWidth: 220,
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--space-3)',
                  display: 'block',
                }}
              />
            )}
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
            />
            <div className="helper-text">
              Take a photo or choose one from your gallery. It'll be resized automatically to keep uploads fast.
            </div>
          </div>

          <div className="field">
            <label htmlFor="name">Product name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="price">Price (₱)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="unit">Unit</label>
            <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="stockQty">Stock quantity</label>
            <input
              id="stockQty"
              type="number"
              min="0"
              step="1"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="category">Category (optional)</label>
            <input
              id="category"
              placeholder="e.g. Snacks, Drinks, Grocery"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add product'}
          </button>
        </form>

        <div className="link-row">
          <Link to="/merchant/products">Cancel</Link>
        </div>
      </div>
    </div>
  )
}
