import { useEffect, useState, useCallback } from 'react';
import { API, apiFetch } from '../lib/api';
import { CATEGORIES, isNewListing } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { PageHeader, Input, Select, Button, EmptyState, Spinner } from '../components/ui';
import ListingCard from '../components/ListingCard';

export default function Browse() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', location: '', minPrice: '', maxPrice: '' });

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    try {
      const data = await apiFetch(`${API.listings}?${qs.toString()}`);
      setListings(data.listings || []);
    } catch (err) {
      showToast(err.message, true);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const isUnfiltered = !filters.q && !filters.category && !filters.location && !filters.minPrice && !filters.maxPrice;
  const freshListings = isUnfiltered ? listings.filter(isNewListing).slice(0, 8) : [];

  const onSubmit = (e) => {
    e.preventDefault();
    load(filters);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Marketplace" title="Browse listings" sub="Everything for sale, tagged and ready." />

      <form onSubmit={onSubmit} className="glass mb-10 grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-6">
        <Input
          className="sm:col-span-2"
          placeholder="Search title or description"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <Select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Input
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
        />
        <Input
          type="number"
          placeholder="Min ₹"
          value={filters.minPrice}
          onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
        />
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Max ₹"
            value={filters.maxPrice}
            onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
          />
          <Button type="submit" className="shrink-0">Search</Button>
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState>No listings match yet — be the first to <a href="/sell" className="grad-text font-semibold">tag something for sale</a>.</EmptyState>
      ) : (
        <>
          {freshListings.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-4 font-display text-xl">🆕 New arrivals</h2>
              <div className="flex gap-5 overflow-x-auto pb-3">
                {freshListings.map((l) => (
                  <div key={l.id} className="w-64 shrink-0">
                    <ListingCard listing={l} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
