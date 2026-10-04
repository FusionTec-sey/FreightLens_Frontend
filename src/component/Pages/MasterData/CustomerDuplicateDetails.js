import React, { useEffect, useState } from 'react';

export default function CustomerDuplicateDetails({ api, item, onReady }) {
  const [profiles, setProfiles] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setProfiles(null); setError(''); onReady(false);
    Promise.all(item.customers.map(ref => api.readVersion(ref.customer_key, ref.version, controller.signal)))
      .then(results => {
        if (controller.signal.aborted) return;
        if (results.some(({ data }, index) => data.customer_key !== item.customers[index].customer_key || data.version !== item.customers[index].version)) throw new Error('Profile mismatch');
        setProfiles(results.map(result => result.data)); onReady(true);
      }).catch(() => { if (!controller.signal.aborted) setError('Exact reviewed profiles could not be loaded. Reopen this case to retry.'); });
    return () => controller.abort();
  }, [api, item, onReady]);
  return <section className="space-y-3">
    <p>Proposed assessment: {item.assessment === 'SAME_CUSTOMER' ? 'Same customer — possible duplicate records' : 'Different customers — keep separate'}</p>
    <p>Approving confirms this assessment only. No records, contacts, sales references or balances are merged.</p>
    {error ? <p role="alert">{error}</p> : !profiles ? <p role="status">Loading exact profile versions…</p> : <div className="grid md:grid-cols-2 gap-3">{profiles.map(profile => <article key={profile.customer_key} className="border rounded p-3 space-y-2">
      <h3 className="font-semibold">{profile.name} · Version {profile.version}</h3><p className="text-xs break-all">{profile.customer_key}</p>
      <p>{profile.kind}</p><ul>{profile.contacts.map((contact, index) => <li key={index} className="break-words">{contact.kind}: {contact.value} {contact.label} {contact.primary ? '(Primary)' : ''}</li>)}</ul>
    </article>)}</div>}
  </section>;
}
