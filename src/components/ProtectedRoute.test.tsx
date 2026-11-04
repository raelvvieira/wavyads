import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const useAuth = vi.fn();
const useRole = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuth() }));
vi.mock('@/hooks/useRole', () => ({ useRole: () => useRole() }));

const montar = () =>
  render(
    <MemoryRouter>
      <ProtectedRoute><p>O SISTEMA</p></ProtectedRoute>
    </MemoryRouter>,
  );

const sessao = (patch: any = {}) => ({ user: { id: 'u1' }, loading: false, signOut: vi.fn(), ...patch });
const papel = (patch: any = {}) => ({ isAdmin: false, isClient: true, role: 'client', isLoading: false, ...patch });

describe('a porta do sistema, depois da migração', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(sessao());
    useRole.mockReturnValue(papel());
  });

  it('cliente não vê o sistema — vê o aviso de que o endereço mudou', () => {
    montar();
    expect(screen.queryByText('O SISTEMA')).toBeNull();
    expect(screen.getByText(/mudou de endereço/i)).toBeTruthy();
  });

  it('admin entra normalmente', () => {
    useRole.mockReturnValue(papel({ isAdmin: true, isClient: false, role: 'admin' }));
    montar();
    expect(screen.getByText('O SISTEMA')).toBeTruthy();
  });

  it('o aviso leva ao CRM, e mostra o endereço por escrito', () => {
    // O link escrito serve a quem vai copiar para outro navegador, ou
    // mandar no WhatsApp para a própria equipe.
    montar();
    const botao = screen.getByRole('link', { name: /Acessar o novo dashboard/i });
    expect(botao.getAttribute('href')).toBe('https://crm.wavymarketing.com.br/');
    expect(screen.getByText('https://crm.wavymarketing.com.br/')).toBeTruthy();
  });

  it('diz que o login é o mesmo — é a frase que evita o chamado', () => {
    montar();
    expect(screen.getByText(/mesmo e-mail e a mesma senha/i)).toBeTruthy();
  });

  it('dá saída: uma tela sem botão nenhum prende quem entrou na conta errada', () => {
    const signOut = vi.fn();
    useAuth.mockReturnValue(sessao({ signOut }));
    montar();
    screen.getByRole('button', { name: /Sair desta conta/i }).click();
    expect(signOut).toHaveBeenCalled();
  });

  it('enquanto o papel carrega, NENHUM lampejo do sistema aparece', () => {
    // Renderizar o conteúdo durante a espera entregaria um instante do
    // sistema a quem a migração tirou dele — e um instante basta.
    useRole.mockReturnValue(papel({ isLoading: true }));
    montar();
    expect(screen.queryByText('O SISTEMA')).toBeNull();
    expect(screen.queryByText(/mudou de endereço/i)).toBeNull();
  });

  it('papel que não respondeu FECHA a porta, em vez de abrir na dúvida', () => {
    // Deixar passar na dúvida entregaria o sistema inteiro sem ninguém
    // perceber. Um admin nessa situação recarrega e entra.
    useRole.mockReturnValue(papel({ role: null, isAdmin: false, isClient: false }));
    montar();
    expect(screen.queryByText('O SISTEMA')).toBeNull();
    expect(screen.getByText(/mudou de endereço/i)).toBeTruthy();
  });

  it('sem sessão continua indo para o login, e não para o aviso', () => {
    useAuth.mockReturnValue(sessao({ user: null }));
    montar();
    expect(screen.queryByText(/mudou de endereço/i)).toBeNull();
    expect(screen.queryByText('O SISTEMA')).toBeNull();
  });
});
