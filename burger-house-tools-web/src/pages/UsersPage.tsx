import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import type { User, UserInput, ContractType } from '../types/user';
import type { UserRole } from '../types/auth';
import { Users, Plus, Shield, DollarSign, UserCheck, Loader2, AlertCircle, Trash2 } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal novo usuário
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Garcom');
  const [contractType, setContractType] = useState<ContractType>('Freelancer');
  const [dailyRate, setDailyRate] = useState<number>(100);
  const [dailyRateWkend, setDailyRateWkend] = useState<number>(120);
  const [pix, setPix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      setError('Erro ao carregar lista de funcionários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const input: UserInput = {
      name,
      login,
      password,
      userRole,
      contractType,
      dailyRate: Number(dailyRate),
      dailyRateWkend: Number(dailyRateWkend),
      pix,
    };

    try {
      await userService.create(input);
      setModalOpen(false);
      setName('');
      setLogin('');
      setPassword('');
      setPix('');
      loadUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setModalError(axiosErr.response?.data?.message || 'Erro ao cadastrar funcionário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, userName: string) => {
    if (!confirm(`Deseja realmente excluir o funcionário ${userName}?`)) return;
    try {
      await userService.delete(id);
      loadUsers();
    } catch {
      alert('Erro ao excluir funcionário.');
    }
  };

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
      case 'Caixa':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <DollarSign className="w-3 h-3 mr-1" />
            Caixa
          </span>
        );
      case 'Garcom':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <UserCheck className="w-3 h-3 mr-1" />
            Garçom
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-amber-600" />
            Quadro de Funcionários
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Gerencie os acessos, cargos e valores de diária da equipe'
              : 'Lista de funcionários cadastrados no sistema'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setModalError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-colors shadow-sm shadow-amber-600/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Funcionário
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando funcionários...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contrato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Chave Pix
                  </th>
                  {isAdmin && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Diária (Semana)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Diária (Fim de Semana)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Ações
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">@{u.login}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{roleBadge(u.userRole)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          u.contractType === 'Clt'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {u.contractType === 'Clt' ? 'CLT' : 'Freelancer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs whitespace-nowrap">{u.pix || '-'}</td>
                    {isAdmin && (
                      <>
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          R$ {(u.dailyRate ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          R$ {(u.dailyRateWkend ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover funcionário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar Funcionário */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Cadastrar Novo Funcionário</h2>
            <p className="text-xs text-slate-500 mb-4">
              Cria o usuário com acesso no Keycloak e salva os dados no banco de dados.
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Carlos Silva"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Login / Usuário
                  </label>
                  <input
                    type="text"
                    required
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="ex: carlossilva"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Função / Cargo
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Garcom">Garçom</option>
                    <option value="Caixa">Caixa</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Tipo de Contrato
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as ContractType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Freelancer">Freelancer</option>
                  <option value="Clt">CLT</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Diária Semana (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Diária Fim de Semana (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dailyRateWkend}
                    onChange={(e) => setDailyRateWkend(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Chave Pix (Opcional)
                </label>
                <input
                  type="text"
                  value={pix}
                  onChange={(e) => setPix(e.target.value)}
                  placeholder="CPF, E-mail ou Telefone"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 transition-colors shadow-sm flex items-center"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Funcionário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
