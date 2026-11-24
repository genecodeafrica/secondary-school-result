import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import './assessments.css';

const emptyForm = {
    name: '',
    code: '',
    maximum_score: '',
    weight: '',
    display_order: 1,
    is_active: true,
};

export default function Assessments() {
    const [components, setComponents] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        active: 0,
        maximum_total: 0,
        weight_total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadComponents = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/assessment-components');
            setComponents(response.data.data || []);
            setSummary(response.data.summary || {});
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load assessment components.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadComponents();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({
            ...emptyForm,
            display_order: components.length + 1,
        });
        setError('');
        setModalOpen(true);
    };

    const openEdit = (component) => {
        setEditing(component);
        setForm({
            name: component.name,
            code: component.code,
            maximum_score: component.maximum_score,
            weight: component.weight,
            display_order: component.display_order,
            is_active: component.is_active,
        });
        setError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setEditing(null);
        setError('');
    };

    const updateField = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((previous) => ({
            ...previous,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const saveComponent = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');

        try {
            const payload = {
                ...form,
                maximum_score: Number(form.maximum_score),
                weight: Number(form.weight),
                display_order: Number(form.display_order),
            };

            if (editing) {
                await apiClient.put(`/assessment-components/${editing.id}`, payload);
                setNotice('Assessment component updated successfully.');
            } else {
                await apiClient.post('/assessment-components', payload);
                setNotice('Assessment component created successfully.');
            }

            setModalOpen(false);
            setEditing(null);
            await loadComponents();
        } catch (err) {
            const validation = err.response?.data?.errors;
            if (validation) {
                setError(Object.values(validation).flat().join(' '));
            } else {
                setError(err.response?.data?.message || 'Unable to save this component.');
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (component) => {
        if (Number(component.scores_count) > 0) return;

        const nextStatus = !component.is_active;
        setError('');
        setNotice('');

        try {
            await apiClient.patch(`/assessment-components/${component.id}/status`, {
                is_active: nextStatus,
            });
            setNotice('Component status updated successfully.');
            await loadComponents();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update component status.');
        }
    };

    const hasSavedScores = Number(editing?.scores_count || 0) > 0;

    return (
        <div className="assessments-page">
            <div className="assessments-heading">
                <div>
                    <span className="assessments-eyebrow">ACADEMIC CONFIGURATION</span>
                    <h1>Assessment Components</h1>
                    <p>Manage the assessment structure used to calculate students' results.</p>
                </div>

                <button className="assessment-primary-btn" onClick={openCreate}>
                    <span>＋</span> Add Component
                </button>
            </div>

            {notice && <div className="assessment-alert success">{notice}</div>}
            {error && !modalOpen && <div className="assessment-alert error">{error}</div>}

            <div className="assessment-summary">
                <div className="assessment-summary-card">
                    <span>Total Components</span>
                    <strong>{summary.total ?? 0}</strong>
                    <small>Configured components</small>
                </div>
                <div className="assessment-summary-card">
                    <span>Active Components</span>
                    <strong>{summary.active ?? 0}</strong>
                    <small>Currently used for scoring</small>
                </div>
                <div className="assessment-summary-card">
                    <span>Maximum Score</span>
                    <strong>{Number(summary.maximum_total || 0).toFixed(2)}<small> / 100</small></strong>
                    <div className="assessment-progress">
                        <span style={{ width: `${Math.min(Number(summary.maximum_total || 0), 100)}%` }} />
                    </div>
                </div>
                <div className="assessment-summary-card">
                    <span>Total Weight</span>
                    <strong>{Number(summary.weight_total || 0).toFixed(2)}<small> / 100</small></strong>
                    <div className="assessment-progress">
                        <span style={{ width: `${Math.min(Number(summary.weight_total || 0), 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="assessment-info">
                <span className="assessment-info-icon">i</span>
                <div>
                    <strong>Protecting existing results</strong>
                    <p>Components with saved scores cannot be deactivated or have their maximum score changed. Their codes and weights are also locked to protect existing result calculations.</p>
                </div>
            </div>

            <section className="assessment-table-card">
                <div className="assessment-table-heading">
                    <div>
                        <h2>Assessment Structure</h2>
                        <p>All components configured for your school</p>
                    </div>
                    <span className="assessment-count">{components.length} components</span>
                </div>

                {loading ? (
                    <div className="assessment-empty">Loading assessment components...</div>
                ) : components.length === 0 ? (
                    <div className="assessment-empty">No assessment components have been configured.</div>
                ) : (
                    <div className="assessment-table-wrap">
                        <table className="assessment-table">
                            <thead>
                                <tr>
                                    <th>ORDER</th>
                                    <th>COMPONENT</th>
                                    <th>CODE</th>
                                    <th>MAX SCORE</th>
                                    <th>WEIGHT</th>
                                    <th>SAVED SCORES</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {components.map((component) => {
                                    const protectedComponent = Number(component.scores_count) > 0;
                                    return (
                                        <tr key={component.id}>
                                            <td><span className="assessment-order">{component.display_order}</span></td>
                                            <td className="assessment-component-name">{component.name}</td>
                                            <td><span className="assessment-code">{component.code}</span></td>
                                            <td>{Number(component.maximum_score).toFixed(2)}</td>
                                            <td>{Number(component.weight).toFixed(2)}%</td>
                                            <td>{component.scores_count ?? 0}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`assessment-status ${component.is_active ? 'active' : 'inactive'}`}
                                                    onClick={() => toggleStatus(component)}
                                                    disabled={protectedComponent}
                                                    title={protectedComponent ? 'Cannot deactivate a component with saved scores' : 'Change component status'}
                                                >
                                                    {component.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td>
                                                <button className="assessment-edit-btn" onClick={() => openEdit(component)}>
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {modalOpen && (
                <div className="assessment-modal-backdrop" onMouseDown={closeModal}>
                    <div className="assessment-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="assessment-modal-heading">
                            <div>
                                <span className="assessments-eyebrow">ASSESSMENT SETUP</span>
                                <h2>{editing ? 'Edit Component' : 'Add Component'}</h2>
                                <p>{editing ? 'Update the component configuration.' : 'Create a new scoring component.'}</p>
                            </div>
                            <button className="assessment-close-btn" onClick={closeModal}>×</button>
                        </div>

                        {error && <div className="assessment-alert error">{error}</div>}

                        <form onSubmit={saveComponent}>
                            <label>
                                Component Name
                                <input name="name" value={form.name} onChange={updateField} required maxLength="255" placeholder="e.g. Continuous Assessment 4" />
                            </label>

                            <div className="assessment-form-grid">
                                <label>
                                    Component Code
                                    <input name="code" value={form.code} onChange={updateField} required maxLength="50" placeholder="e.g. CA4" disabled={hasSavedScores} />
                                </label>
                                <label>
                                    Maximum Score
                                    <input name="maximum_score" type="number" min="0.01" max="100" step="0.01" value={form.maximum_score} onChange={updateField} required disabled={hasSavedScores} />
                                </label>
                                <label>
                                    Weight (%)
                                    <input name="weight" type="number" min="0.01" max="100" step="0.01" value={form.weight} onChange={updateField} required disabled={hasSavedScores} />
                                </label>
                                <label>
                                    Display Order
                                    <input name="display_order" type="number" min="0" step="1" value={form.display_order} onChange={updateField} />
                                </label>
                            </div>

                            {!editing && (
                                <label className="assessment-checkbox-label">
                                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} />
                                    Make this component active
                                </label>
                            )}

                            {hasSavedScores && (
                                <p className="assessment-lock-note">This component already has saved scores. Its code, maximum score and weight are locked to protect existing results.</p>
                            )}

                            <div className="assessment-modal-actions">
                                <button type="button" className="assessment-cancel-btn" onClick={closeModal} disabled={saving}>Cancel</button>
                                <button type="submit" className="assessment-primary-btn" disabled={saving}>
                                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Component'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
