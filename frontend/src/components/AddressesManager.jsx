import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addressService } from "../services/addressService";

export default function AddressesManager() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: "", phone: "", city: "", district: "", ward: "", street: "", is_default: false
  });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { items } = await addressService.list();
    setItems(items || []);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg("");
    try {
      if (editing) {
        await addressService.update(editing._id, form);
      } else {
        await addressService.create(form);
      }
      setForm({ name:"", phone:"", city:"", district:"", ward:"", street:"", is_default:false });
      setEditing(null);
      await load();
      setMsg(t("profile.address_saved"));
    } catch (e) {
      setMsg(e.message);
    }
  };

  const onEdit = (it) => { setEditing(it); setForm({ ...it }); };
  const onDelete = async (id) => { if (confirm(t("profile.delete_address_confirm_short"))) { await addressService.remove(id); load(); } };
  const onSetDefault = async (id) => { await addressService.setDefault(id); load(); };

  return (
    <div className="pf-card">
      <div className="pf-card-title">{t("profile.delivery_addresses")}</div>

      <form className="grid-3 mb16" onSubmit={onSubmit}>
        <label>{t("profile.full_name_label")}<input required value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} /></label>
        <label>{t("common.phone")}<input required value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} /></label>
        <label>{t("profile.city")}<input required value={form.city} onChange={e=>setForm({ ...form, city: e.target.value })} /></label>
        <label>{t("profile.district")}<input required value={form.district} onChange={e=>setForm({ ...form, district: e.target.value })} /></label>
        <label>{t("profile.ward")}<input required value={form.ward} onChange={e=>setForm({ ...form, ward: e.target.value })} /></label>
        <label>{t("profile.street_detail")}<input required value={form.street} onChange={e=>setForm({ ...form, street: e.target.value })} /></label>
        <label className="row">
          <input type="checkbox" checked={!!form.is_default} onChange={e=>setForm({ ...form, is_default: e.target.checked })} />
          {" "}{t("profile.set_as_default")}
        </label>
        <div className="pf-actions">
          <button>{editing ? t("common.update") : t("common.add_new")}</button>
          {editing && (
            <button
              type="button"
              className="link"
              onClick={() => {
                setEditing(null);
                setForm({ name:"", phone:"", city:"", district:"", ward:"", street:"", is_default:false });
              }}
            >
              {t("common.cancel")}
            </button>
          )}
          <span className="pf-msg">{msg}</span>
        </div>
      </form>

      <ul className="pf-list">
        {items.map(it => (
          <li key={it._id} className={it.is_default ? "is-default" : ""}>
            <div>
              <div className="title">{it.name} • {it.phone}</div>
              <div className="sub">{it.street}, {it.ward}, {it.district}, {it.city}</div>
            </div>
            <div className="actions">
              {!it.is_default && <button className="link" onClick={()=>onSetDefault(it._id)}>{t("profile.set_default")}</button>}
              <button className="link" onClick={()=>onEdit(it)}>{t("common.edit")}</button>
              <button className="link danger" onClick={()=>onDelete(it._id)}>{t("common.delete")}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
