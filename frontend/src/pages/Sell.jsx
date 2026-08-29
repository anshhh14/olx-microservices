import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API, apiFetch } from '../lib/api';
import { CATEGORIES } from '../lib/format';
import { Field, Input, Textarea, Select, Button, ErrorText, GradWord } from '../components/ui';
import RestrictedNotice, { LoginLink } from '../components/RestrictedNotice';

export default function Sell() {
  const { auth, isLoggedIn, mode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', price: '', category: '', location: '',
    pickupLocation1: '', pickupLocation2: '', pickupLocation3: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isLoggedIn) {
    return <RestrictedNotice>You need to <LoginLink /> before posting a listing.</RestrictedNotice>;
  }
  if (mode !== 'seller') {
    return (
      <RestrictedNotice>
        You're currently in buying mode. <Link to="/choose-role" className="grad-text font-semibold">Switch to selling</Link> to post a listing.
      </RestrictedNotice>
    );
  }

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.set(k, v));
      fd.set('userId', auth.id);
      if (imageFile) fd.set('image', imageFile);

      const listing = await apiFetch(`${API.listings}`, { method: 'POST', body: fd });
      showToast('Listing posted');
      navigate(`/listing/${listing.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="glass fade-up relative overflow-hidden rounded-3xl p-8">
        <div className="tag-hole" />
        <h1 className="font-display text-2xl sm:text-3xl">Tag something for <GradWord>sale</GradWord></h1>
        <p className="mt-1 text-sm text-[var(--color-fg)]/50">Fill in the details — photo is optional.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Field label="Title">
            <Input required maxLength={120} value={form.title} onChange={set('title')} />
          </Field>
          <Field label="Description">
            <Textarea rows={4} maxLength={2000} value={form.description} onChange={set('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)">
              <Input type="number" min="0" step="1" required value={form.price} onChange={set('price')} />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={set('category')}>
                <option value="">Choose</option>
                {CATEGORIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Location">
            <Input maxLength={120} value={form.location} onChange={set('location')} />
          </Field>

          <fieldset className="rounded-xl border border-[var(--color-fg)]/10 p-4">
            <legend className="px-1 text-sm font-medium text-[var(--color-fg)]/70">Pickup spots (optional)</legend>
            <p className="mb-3 text-xs text-[var(--color-fg)]/40">
              If buyers can collect this in person, list up to 3 spots you can meet at — they'll get to pick one when they choose "Pick up myself" at checkout.
            </p>
            <div className="space-y-3">
              <Input placeholder="Pickup spot 1 — e.g. Sector 12 metro station" maxLength={255} value={form.pickupLocation1} onChange={set('pickupLocation1')} />
              <Input placeholder="Pickup spot 2" maxLength={255} value={form.pickupLocation2} onChange={set('pickupLocation2')} />
              <Input placeholder="Pickup spot 3" maxLength={255} value={form.pickupLocation3} onChange={set('pickupLocation3')} />
            </div>
          </fieldset>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-fg)]/15 bg-[var(--color-fg)]/[0.02] px-4 py-8 text-center transition hover:border-[var(--color-accent)]/40">
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            {imagePreview ? (
              <img src={imagePreview} alt="" className="max-h-40 rounded-lg object-cover" />
            ) : (
              <span className="text-sm text-[var(--color-fg)]/50">Click to add a photo</span>
            )}
          </label>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Posting…' : 'Post listing'}
          </Button>
          <ErrorText>{error}</ErrorText>
        </form>
      </div>
    </div>
  );
}
