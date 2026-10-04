import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useOperationIntent from '../../../hooks/useOperationIntent';
import { UserPlus } from 'lucide-react';
import { RegisterHeader, fieldLabelClass, hintClass, inputClass, messageClass, pageClass, panelClass, primaryButtonClass, secondaryButtonClass, selectClass } from '../../UI/UXComponent/RegisterShell';

const blankContact = () => ({ kind: 'PHONE', value: '', label: '', primary: false });

export default function CustomerCreateForm({ api, orgId, onSaved, onClose }) {
  const [profile, setProfile] = useState({ name: '', kind: 'PERSON', contacts: [{ ...blankContact(), primary: true }] });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [discard, setDiscard] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const controller = useRef(null);
  const { payloadFor } = useOperationIntent();
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  const dirty = Boolean(profile.name || profile.contacts.some(c => c.value || c.label) || pending);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const changeContact = (index, values) => setProfile(p => ({ ...p, contacts: p.contacts.map((c, i) => i === index ? { ...c, ...values } : c) }));
  async function save() {
    if (inFlight.current) return;
    let body = pending;
    if (!body) {
      const problems = {};
      if (!profile.name.trim()) problems.name = 'Enter a customer name.';
      profile.contacts.forEach((c, i) => { if (!c.value.trim()) problems[`contacts.${i}`] = 'Enter a contact value.'; });
      setErrors(problems);
      if (Object.keys(problems).length) return;
      try { body = payloadFor(['customer.create', orgId], { expected_version: 0, profile }); }
      catch { setMessage('Secure request identity is unavailable. No request was sent.'); return; }
    }
    inFlight.current = true; setBusy(true); setMessage(''); setPending(body);
    controller.current = new AbortController();
    try {
      const { data } = await api.create(body, controller.current.signal);
      if (!alive.current) return;
      if (data?.customer_key !== body.operation_key || data?.version !== 1) throw new Error('Unconfirmed receipt');
      toast.success(data.replayed ? 'Customer save confirmed.' : 'Customer created.');
      if (data.search_indexed !== true) toast.info('Customer saved. Search indexing is unconfirmed and may need repair. Use the unfiltered customer register; do not create a duplicate.');
      onSaved(data);
    } catch (error) {
      if (!alive.current) return;
      if (error.response?.status === 422) {
        setPending(null);
        const detail = error.response.data?.detail;
        const fields = {};
        if (Array.isArray(detail)) detail.forEach(entry => {
          const loc = (entry.loc || []).filter(p => p !== 'body' && p !== 'profile');
          const key = loc[0] === 'contacts' && Number.isInteger(loc[1]) ? `contacts.${loc[1]}` : loc[0] || 'profile';
          fields[key] = entry.msg;
        });
        setErrors(fields);
        setMessage(typeof detail === 'string' ? detail : 'Correct the highlighted customer details.');
      } else {
        setMessage('Save not confirmed. Keep this form open and retry the same request. Do not create another customer for this attempt.');
      }
      toast.error('Customer save was not confirmed.');
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const input = `block w-full ${inputClass}`;
  const select = `block w-full ${selectClass}`;
  const button = secondaryButtonClass;
  return <section className={pageClass} aria-label="New customer form">
    <RegisterHeader icon={UserPlus} title="New customer"
      description="No credit, consent or financial terms are assigned. Review contact details before saving." />
    <p className={hintClass}>Keep this screen open until save is confirmed. Draft recovery after navigation is not yet available.</p>
    <div className="flex-1 min-h-0 overflow-auto space-y-4">
      {message && <p role="alert" className={messageClass('error')}>{message}</p>}
      {pending && <p className={`${hintClass} break-all`}>Request reference: {pending.operation_key}</p>}
      {errors.profile && <p role="alert" className={messageClass('error')}>{errors.profile}</p>}
      <fieldset disabled={busy || Boolean(pending)} className={`${panelClass} space-y-4 disabled:opacity-70`}>
        <div className="grid md:grid-cols-2 gap-3">
          <label><span className={fieldLabelClass}>Customer name</span><input autoFocus className={input} maxLength={160} value={profile.name} aria-invalid={Boolean(errors.name)} onChange={e => setProfile({ ...profile, name: e.target.value })} />{errors.name && <span role="alert" className="mt-1 block text-xs font-semibold text-rose-700 dark:text-rose-300">{errors.name}</span>}</label>
          <label><span className={fieldLabelClass}>Customer type</span><select className={select} value={profile.kind} onChange={e => setProfile({ ...profile, kind: e.target.value })}><option value="PERSON">Person</option><option value="BUSINESS">Business</option></select></label>
        </div>
        <h2 className="font-semibold">Contacts — choose one primary</h2>
        {errors.contacts && <p role="alert">{errors.contacts}</p>}
        {profile.contacts.map((contact, index) => <fieldset key={index} className={`${panelClass} space-y-2`}>
          <legend>Contact {index + 1}</legend>
          <div className="grid md:grid-cols-3 gap-3">
            <label><span className={fieldLabelClass}>Contact type {index + 1}</span><select className={select} value={contact.kind} onChange={e => changeContact(index, { kind: e.target.value })}><option value="PHONE">Phone</option><option value="EMAIL">Email</option></select></label>
            <label><span className={fieldLabelClass}>Contact value {index + 1}</span><input className={input} maxLength={160} value={contact.value} aria-invalid={Boolean(errors[`contacts.${index}`])} onChange={e => changeContact(index, { value: e.target.value })} /></label>
            <label><span className={fieldLabelClass}>Label {index + 1}</span><input className={input} maxLength={60} value={contact.label} onChange={e => changeContact(index, { label: e.target.value })} /></label>
          </div>
          {errors[`contacts.${index}`] && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{errors[`contacts.${index}`]}</p>}
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="primary-contact" checked={contact.primary} onChange={() => setProfile(p => ({ ...p, contacts: p.contacts.map((c, i) => ({ ...c, primary: i === index })) }))} /> Primary contact {index + 1}</label>
          <button type="button" className={button} disabled={profile.contacts.length === 1} onClick={() => setProfile(p => {
            const contacts = p.contacts.filter((_, i) => i !== index);
            if (!contacts.some(c => c.primary)) contacts[0] = { ...contacts[0], primary: true };
            return { ...p, contacts };
          })}>Remove contact {index + 1}</button>
        </fieldset>)}
        <button type="button" className={button} disabled={profile.contacts.length >= 16} onClick={() => setProfile(p => ({ ...p, contacts: [...p.contacts, blankContact()] }))}>Add contact</button>
      </fieldset>
    </div>
    <footer className="shrink-0 flex flex-wrap gap-3">
      {discard ? <><p role="alert">Discard these unsaved details?</p><button type="button" className={button} onClick={onClose}>Discard draft</button><button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button></> : <>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={save}>{busy ? 'Saving…' : pending ? 'Retry same request' : 'Save customer'}</button>
        <button type="button" className={button} disabled={busy || Boolean(pending)} onClick={() => dirty ? setDiscard(true) : onClose()}>Cancel</button>
      </>}
    </footer>
  </section>;
}
