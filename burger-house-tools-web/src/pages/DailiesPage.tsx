import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dailyService } from '../services/dailyService';
import { advanceService } from '../services/advanceService';
import { userService } from '../services/userService';
import type { Daily, DailyPeriodResponse, WeeklyUserSummaryResponse } from '../types/daily';
import type { Advance } from '../types/advance';
import type { User } from '../types/user';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Loader2,
  DollarSign,
  Info,
  Users as UsersIcon,
  KeyRound
} from 'lucide-react';

export const DailiesPage: React.FC = () => {
  const { isAdmin, isCaixa } = useAuth();
  const [mode, setMode] = useState<'Weekly' | 'Monthly' | 'Summary'>('Weekly');
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [data, setData] = useState<DailyPeriodResponse | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyUserSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de cadastro (múltiplos funcionários)
  const [modalOpen, setModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [dailyDate, setDailyDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dailyNotes, setDailyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal de edição de observação
  const [editingDaily, setEditingDaily] = useState<Daily | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Adiantamentos (Advances)
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [selectedAdvanceUserId, setSelectedAdvanceUserId] = useState<number | null>(null);
  const [advanceDate, setAdvanceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [advanceValue, setAdvanceValue] = useState<string>('');
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [advanceModalError, setAdvanceModalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'Weekly') {
        const [res, summaryRes] = await Promise.all([
          dailyService.getWeekly({ date: currentDate }),
          dailyService.getWeeklySummary({ date: currentDate }),
        ]);
        const advRes = await advanceService.getAll({
          startDate: res.startDate,
          endDate: res.endDate,
        });
        setData(res);
        setWeeklySummary(summaryRes);
        setAdvances(advRes);
      } else if (mode === 'Summary') {
        const summaryRes = await dailyService.getWeeklySummary({ date: currentDate });
        const advRes = await advanceService.getAll({
          startDate: summaryRes.startDate,
          endDate: summaryRes.endDate,
        });
        setWeeklySummary(summaryRes);
        setAdvances(advRes);
      } else {
        const [year, month] = currentDate.split('-').map(Number);
        const [res, summaryRes, advRes] = await Promise.all([
          dailyService.getMonthly({ year, month }),
          dailyService.getMonthlySummary({ year, month }),
          advanceService.getAll({ year, month }),
        ]);
        setData(res);
        setWeeklySummary(summaryRes);
        setAdvances(advRes);
      }
    } catch {
      setError('Erro ao carregar diárias do período.');
    } finally {
      setLoading(false);
    }
  }, [mode, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Carrega lista de funcionários para o modal
  const openCreateModal = async (targetDate?: string) => {
    setModalError(null);
    setDailyNotes('');
    setSelectedUserIds([]);
    setDailyDate(targetDate ?? currentDate);
    setModalOpen(true);

    try {
      const users = await userService.getAll();
      setUsersList(users);
    } catch {
      setModalError('Não foi possível carregar a lista de funcionários.');
    }
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setSubmitting(true);
    setModalError(null);

    try {
      await dailyService.createBatch({
        userIds: selectedUserIds,
        date: dailyDate,
        paid: false,
        notes: dailyNotes.trim() ? dailyNotes.trim() : undefined,
      });
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setModalError(axiosErr.response?.data?.message || 'Erro ao registrar diárias.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePay = async (id: number, currentPaid: boolean) => {
    try {
      await dailyService.setPaid(id, !currentPaid);
      loadData();
    } catch {
      alert('Erro ao atualizar status de pagamento.');
    }
  };

  const handlePayUserWeek = async (userId: number, userName: string) => {
    if (!confirm(`Deseja marcar todas as diárias da semana de ${userName} como pagas?`)) return;

    try {
      await dailyService.payWeek({
        userId,
        date: currentDate,
        paid: true,
      });
      loadData();
    } catch {
      alert('Erro ao pagar a semana do funcionário.');
    }
  };

  const handleDeleteDaily = async (id: number) => {
    if (!confirm('Deseja realmente remover esta diária?')) return;
    try {
      await dailyService.delete(id);
      loadData();
    } catch {
      alert('Erro ao excluir diária.');
    }
  };

  const openEditModal = (daily: Daily) => {
    setEditError(null);
    setEditingDaily(daily);
    setEditNotes(daily.notes ?? '');
  };

  const handleUpdateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDaily) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      await dailyService.updateNotes(
        editingDaily.id,
        editNotes.trim() ? editNotes.trim() : undefined
      );
      setEditingDaily(null);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setEditError(axiosErr.response?.data?.message || 'Erro ao atualizar observação.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Modal de Adiantamento (apenas 1 funcionário + valor)
  const openAdvanceModal = async (targetDate?: string) => {
    setAdvanceModalError(null);
    setSelectedAdvanceUserId(null);
    setAdvanceValue('');
    setAdvanceNotes('');
    setAdvanceDate(targetDate ?? currentDate);
    setAdvanceModalOpen(true);

    try {
      const users = await userService.getAll();
      setUsersList(users);
    } catch {
      setAdvanceModalError('Não foi possível carregar a lista de funcionários.');
    }
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvanceUserId) return;

    const numericValue = Number(advanceValue.replace(',', '.'));
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      setAdvanceModalError('Informe um valor válido maior que zero.');
      return;
    }

    setAdvanceSubmitting(true);
    setAdvanceModalError(null);

    try {
      await advanceService.create({
        userId: selectedAdvanceUserId,
        value: numericValue,
        date: advanceDate,
        notes: advanceNotes.trim() ? advanceNotes.trim() : undefined,
      });
      setAdvanceModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAdvanceModalError(axiosErr.response?.data?.message || 'Erro ao registrar adiantamento.');
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  const handleDeleteAdvance = async (id: number) => {
    if (!confirm('Deseja realmente remover este adiantamento?')) return;
    try {
      await advanceService.delete(id);
      loadData();
    } catch {
      alert('Erro ao excluir adiantamento.');
    }
  };

  // Navegação de datas
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (mode === 'Weekly' || mode === 'Summary') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (mode === 'Weekly' || mode === 'Summary') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Barra de Controles do Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          {/* Alternador Semanal / Mensal / Resumo Semanal */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setMode('Weekly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'Weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setMode('Monthly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'Monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setMode('Summary')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'Summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resumo Semanal
            </button>
          </div>

          {/* Navegador de Período */}
          <div className="flex items-center space-x-1 pl-2">
            <button
              onClick={handlePrev}
              title="Período anterior"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              title="Próximo período"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm font-semibold text-slate-800 pl-2 hidden md:block">
            {mode === 'Summary' ? weeklySummary?.period : data?.period}
          </div>
        </div>
      </div>

      {/* Banner Informativo para Caixa */}
      {isCaixa && !isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center">
          <Info className="w-5 h-5 mr-3 shrink-0 text-amber-600" />
          <span>
            Perfil <strong>Caixa</strong>: Você pode registrar e visualizar os turnos trabalhados pela equipe. Os valores financeiros são restritos à administração.
          </span>
        </div>
      )}

      {/* Totalizadores Financeiros (Apenas Admin) */}
      {isAdmin && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total do Período</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                R$ {(data.totalValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Pago</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                R$ {(data.totalPaid ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Total Pendente</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                R$ {(data.totalPending ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Grade de Diárias */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando diárias do período...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {mode !== 'Summary' && data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {data.days.map((day) => {
                const isToday = day.date === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={day.date}
                    className={`bg-white rounded-2xl border transition-all flex flex-col ${
                      isToday
                        ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                        : day.isWeekend
                        ? 'border-slate-300 bg-slate-50/50'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div
                      className={`p-3 border-b rounded-t-2xl flex items-center justify-between ${
                        isToday
                          ? 'bg-amber-500 text-white border-amber-500'
                          : day.isWeekend
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-xs uppercase font-bold block tracking-wider">
                          {day.dayOfWeek}
                        </span>
                        <span className="text-sm font-semibold">{day.date.split('-').slice(1).reverse().join('/')}</span>
                      </div>

                      {day.isWeekend && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isToday ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          FDS
                        </span>
                      )}
                    </div>

                    {/* Lista de Diárias e Adiantamentos do Dia */}
                    {(() => {
                      const dayAdvances = advances.filter((a) => a.date === day.date);
                      return (
                        <div className="p-3 space-y-2.5 flex-1 min-h-[140px]">
                          {day.dailies.length === 0 && dayAdvances.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 py-6">
                              Sem registros
                            </div>
                          ) : (
                            <>
                              {day.dailies.map((daily) => (
                                <div
                                  key={daily.id}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors text-xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div>
                                      <p className="font-semibold text-slate-900 leading-tight">{daily.userName}</p>
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {daily.userRole}
                                      </span>
                                    </div>

                                    {daily.paid ? (
                                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                        Pago
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                        Pendente
                                      </span>
                                    )}
                                  </div>

                                  {daily.notes && (
                                    <p className="text-[11px] text-slate-500 italic line-clamp-2">“{daily.notes}”</p>
                                  )}

                                  {/* Valor (Apenas Admin) */}
                                  {isAdmin && typeof daily.value === 'number' && (
                                    <div className="font-bold text-slate-900 pt-1 border-t border-slate-100 flex items-center justify-between">
                                      <span>Valor:</span>
                                      <span>R$ {daily.value.toFixed(2)}</span>
                                    </div>
                                  )}

                                  {/* Ações da Diária (Editar observação para Admin/Caixa; Pagar/Excluir para Admin) */}
                                  {(isAdmin || isCaixa) && (
                                    <div className="flex items-center justify-end space-x-1 pt-1.5 border-t border-slate-100">
                                      <button
                                        onClick={() => openEditModal(daily)}
                                        title="Editar observação"
                                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>

                                      {isAdmin && (
                                        <>
                                          <button
                                            onClick={() => handleTogglePay(daily.id, daily.paid)}
                                            title={daily.paid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                                            className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                              daily.paid ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                                            }`}
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>

                                          <button
                                            onClick={() => handleDeleteDaily(daily.id)}
                                            title="Remover diária"
                                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Lista de Adiantamentos do Dia (Visível para Admin e Caixa) */}
                              {dayAdvances.map((adv) => (
                                <div
                                  key={`adv-${adv.id}`}
                                  className="p-2.5 rounded-xl border border-red-200 bg-red-50/60 shadow-xs text-xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div>
                                      <p className="font-semibold text-slate-900 leading-tight">{adv.userName}</p>
                                      <span className="text-[10px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-semibold">
                                        Adiantamento
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => handleDeleteAdvance(adv.id)}
                                      title="Remover adiantamento"
                                      className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-100 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {adv.notes && (
                                    <p className="text-[11px] text-slate-600 italic line-clamp-2">“{adv.notes}”</p>
                                  )}

                                  <div className="font-bold text-red-700 pt-1 border-t border-red-200/70 flex items-center justify-between">
                                    <span>Valor:</span>
                                    <span>R$ {adv.value.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Rodapé do Card do Dia: Total (Apenas Admin) e Botões + (Vermelho = Adiantamento, Âmbar = Diária) */}
                    {(isAdmin || isCaixa) && (
                      <div className="p-2.5 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between text-xs">
                        <div>
                          {isAdmin && typeof day.dayTotal === 'number' && (() => {
                            const dayAdvancesTotal = advances
                              .filter((a) => a.date === day.date)
                              .reduce((sum, a) => sum + a.value, 0);
                            const netDayTotal = day.dayTotal - dayAdvancesTotal;
                            return (
                              <>
                                <span className="text-slate-500 mr-1">Total:</span>
                                <span className="font-bold text-slate-900">R$ {netDayTotal.toFixed(2)}</span>
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex items-center space-x-1.5 ml-auto">
                          <button
                            onClick={() => openAdvanceModal(day.date)}
                            title="Registrar adiantamento neste dia"
                            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white flex items-center justify-center transition-all shadow-md shadow-red-600/25 hover:scale-105"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          <button
                            onClick={() => openCreateModal(day.date)}
                            title="Registrar diárias neste dia"
                            className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white flex items-center justify-center transition-all shadow-md shadow-amber-600/25 hover:scale-105"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo Semanal / Mensal por Funcionário */}
          {weeklySummary && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/60">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <UsersIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {mode === 'Monthly'
                        ? 'Resumo Mensal por Funcionário (Adiantamentos CLT)'
                        : 'Resumo Semanal por Funcionário (Adiantamentos Freelancer)'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {weeklySummary.period} • {weeklySummary.totalDailiesCount}{' '}
                      {weeklySummary.totalDailiesCount === 1 ? 'diária realizada' : 'diárias realizadas'}
                      {(weeklySummary.totalAdvances ?? 0) > 0 && (
                        <span className="ml-2 text-red-600 font-semibold">
                          • Adiantamentos: - R$ {(weeklySummary.totalAdvances ?? 0).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {weeklySummary.users.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Nenhum registro encontrado neste período.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {weeklySummary.users.map((u) => (
                    <div
                      key={u.userId}
                      className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                    >
                      {/* Dados do Funcionário */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{u.userName}</span>
                          <span className="text-xs text-slate-400">@{u.login}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {u.userRole}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              u.contractType === 'Clt'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {u.contractType === 'Clt' ? 'CLT' : 'Freelancer'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center">
                            <KeyRound className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            Pix: <strong className="ml-1 text-slate-700">{u.pix || 'Não informado'}</strong>
                          </span>

                          {isAdmin && typeof u.dailyRate === 'number' && typeof u.dailyRateWkend === 'number' && (
                            <span>
                              Diária Sem.: <strong className="text-slate-700">R$ {u.dailyRate.toFixed(2)}</strong> • FDS:{' '}
                              <strong className="text-slate-700">R$ {u.dailyRateWkend.toFixed(2)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantidades e Valores do Período */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                            Total Diárias
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {u.totalDailies}
                          </span>
                          <span className="text-slate-500 ml-1.5 text-[11px]">
                            ({u.weekdayDailies} sem. / {u.weekendDailies} FDS)
                          </span>
                        </div>

                        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center space-x-3">
                          <div>
                            <span className="text-emerald-600 block text-[10px] uppercase font-semibold">
                              Pagas
                            </span>
                            <span className="font-bold text-emerald-700 text-sm">{u.paidDailies}</span>
                          </div>
                          <div className="h-6 w-px bg-slate-200" />
                          <div>
                            <span className="text-amber-600 block text-[10px] uppercase font-semibold">
                              Pendentes
                            </span>
                            <span className="font-bold text-amber-700 text-sm">{u.pendingDailies}</span>
                          </div>
                        </div>

                        {(u.totalAdvances ?? 0) > 0 && (
                          <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs">
                            <span className="text-red-600 block text-[10px] uppercase font-semibold">
                              Adiantamentos ({u.advancesCount ?? 0})
                            </span>
                            <span className="font-bold text-red-700 text-sm">
                              - R$ {(u.totalAdvances ?? 0).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {isAdmin && typeof u.totalValue === 'number' && (
                          <div className="px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200 text-xs min-w-[160px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 font-medium">Líquido:</span>
                              <span className="font-bold text-slate-900 text-sm">
                                R$ {u.totalValue.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] mt-0.5">
                              <span className="text-emerald-700">
                                Pago: R$ {(u.totalPaid ?? 0).toFixed(2)}
                              </span>
                              <span className="text-amber-700 ml-2">
                                Pend.: R$ {(u.totalPending ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {isAdmin && mode !== 'Monthly' && (
                          u.pendingDailies > 0 ? (
                            <button
                              onClick={() => handlePayUserWeek(u.userId, u.userName)}
                              title={`Pagar a semana toda de ${u.userName}`}
                              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm shadow-emerald-600/20"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1.5" />
                              Pagar Semana
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 mr-1.5" />
                              Semana Paga
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro de Diária (Múltiplos Funcionários) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
              <CalendarIcon className="w-5 h-5 text-amber-600 mr-2" />
              Registrar Diária
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Selecione um ou mais funcionários para o turno. O valor é calculado automaticamente conforme o dia.
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDaily} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Data do Turno
                </label>
                <input
                  type="date"
                  required
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Funcionários ({selectedUserIds.length} selecionado{selectedUserIds.length === 1 ? '' : 's'})
                  </label>
                  {usersList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const alreadyScheduledIds = new Set(
                          data?.days.find((d) => d.date === dailyDate)?.dailies.map((d) => d.userId) ?? []
                        );
                        const availableIds = usersList
                          .filter((u) => !alreadyScheduledIds.has(u.id))
                          .map((u) => u.id);
                        if (selectedUserIds.length === availableIds.length) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(availableIds);
                        }
                      }}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      {selectedUserIds.length > 0 ? 'Limpar seleção' : 'Selecionar todos'}
                    </button>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {usersList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                      Nenhum funcionário cadastrado.
                    </div>
                  ) : (
                    usersList.map((u) => {
                      const alreadyScheduled = Boolean(
                        data?.days.find((d) => d.date === dailyDate)?.dailies.some((d) => d.userId === u.id)
                      );
                      const isSelected = selectedUserIds.includes(u.id);

                      return (
                        <button
                          key={u.id}
                          type="button"
                          disabled={alreadyScheduled}
                          onClick={() => toggleSelectUser(u.id)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                            alreadyScheduled
                              ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                alreadyScheduled
                                  ? 'border-slate-300 bg-slate-200 text-slate-500'
                                  : isSelected
                                  ? 'border-amber-600 bg-amber-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {(isSelected || alreadyScheduled) && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{u.name}</p>
                              <span className="text-[10px] text-slate-500">@{u.login}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {alreadyScheduled && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                Já escalado
                              </span>
                            )}
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {u.userRole}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={dailyNotes}
                  onChange={(e) => setDailyNotes(e.target.value)}
                  placeholder="ex: Cobriu turno do almoço, ficou até o fechamento..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting || selectedUserIds.length === 0}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 transition-colors shadow-sm flex items-center"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar ({selectedUserIds.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Observação */}
      {editingDaily && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
              <Pencil className="w-5 h-5 text-amber-600 mr-2" />
              Editar Observação
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {editingDaily.userName} ({editingDaily.userRole}) —{' '}
              {editingDaily.date.split('-').reverse().join('/')}
            </p>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="ex: Cobriu turno do almoço, ficou até o fechamento..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDaily(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 transition-colors shadow-sm flex items-center"
                >
                  {editSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Observação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Adiantamento (1 Funcionário + Valor) */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
              <DollarSign className="w-5 h-5 text-red-600 mr-1.5" />
              Registrar Adiantamento
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Selecione um funcionário e informe o valor do adiantamento concedido.
            </p>

            {advanceModalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                <span>{advanceModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdvance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Data do Adiantamento
                </label>
                <input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Funcionário
                </label>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {usersList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                      Nenhum funcionário cadastrado.
                    </div>
                  ) : (
                    usersList.map((u) => {
                      const isSelected = selectedAdvanceUserId === u.id;

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedAdvanceUserId(u.id)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-red-500 bg-red-50/70 ring-1 ring-red-500'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                                isSelected
                                  ? 'border-red-600 bg-red-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{u.name}</p>
                              <span className="text-[10px] text-slate-500">@{u.login}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {u.userRole}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Valor do Adiantamento (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={advanceValue}
                  onChange={(e) => setAdvanceValue(e.target.value)}
                  placeholder="ex: 50.00"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="ex: Adiantamento em dinheiro no caixa..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={advanceSubmitting || !selectedAdvanceUserId || !advanceValue}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-sm flex items-center"
                >
                  {advanceSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Adiantamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
