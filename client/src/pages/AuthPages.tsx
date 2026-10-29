import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, Lock, Mail, MailCheck } from 'lucide-react';
import { BottleArt } from '../components/product/BottleArt';
import { Button } from '../components/ui/Button';
import { Checkbox, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { toast } from '../store/toast';

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="container-page grid min-h-[calc(100dvh-72px)] items-center gap-10 py-12 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass mx-auto w-full max-w-md rounded-3xl p-7 shadow-card sm:p-9"
      >
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </motion.div>
      <div className="relative hidden h-[560px] items-center justify-center lg:flex" aria-hidden>
        <div className="absolute size-80 rounded-full bg-violet/30 blur-[100px]" />
        <div className="absolute size-60 translate-x-24 translate-y-16 rounded-full bg-cyan/20 blur-[90px]" />
        <BottleArt shape="CHAMPAGNE" color="#E9D18A" brand="NEON CLUB" className="relative h-[440px] w-auto -rotate-6 animate-float" />
        <BottleArt shape="SQUARE" color="#7DD3FC" brand="NEON" className="absolute right-[12%] bottom-10 h-56 w-auto rotate-6 opacity-80" />
      </div>
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} leading={<Lock className="size-4" />} className="pr-11" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 bottom-1.5 rounded-lg p-2 text-fg-subtle hover:text-fg"
        style={{ bottom: props.error || props.hint ? 26 : 6 }}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function LoginPage() {
  const { login, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));

  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : (next ?? '/cuenta')} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Hola, ${u.firstName}`);
      navigate(u.role === 'ADMIN' ? '/admin' : (next ?? '/'), { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={
        <>
          ¿No tienes cuenta?{' '}
          <Link to={`/registro${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-cyan hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">{error}</p>}
        <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" leading={<Mail className="size-4" />} required autoFocus />
        <PasswordInput label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <div className="flex justify-end">
          <Link to="/recuperar-contrasena" className="text-sm text-fg-muted hover:text-cyan">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !password}>
          Ingresar
        </Button>
      </form>
    </AuthShell>
  );
}

const maxBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

export function RegisterPage() {
  const { register, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', birthDate: '', password: '', confirm: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={next ?? '/cuenta'} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setErrors({ confirm: 'Las contraseñas no coinciden' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { confirm: _c, ...data } = form;
      const u = await register({ ...data, acceptTerms });
      toast.success(`¡Bienvenido, ${u.firstName}!`, 'Tu cuenta fue creada.');
      navigate(next ?? '/', { replace: true });
    } catch (err) {
      const e = err as ApiError;
      setErrors(e.fields ?? {});
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to={`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-cyan hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" required />
          <Input label="Apellido" value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" required />
        </div>
        <Input label="Correo electrónico" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={set('birthDate')} error={errors.birthDate} max={maxBirthDate()} required />
          <Input label="Celular" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" optional />
        </div>
        <PasswordInput label="Contraseña" value={form.password} onChange={set('password')} error={errors.password} hint="Mínimo 8 caracteres, con letras y números" autoComplete="new-password" required />
        <PasswordInput label="Repite la contraseña" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" required />
        <Checkbox
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          error={errors.acceptTerms}
          label={
            <>
              Soy mayor de 18 años y acepto los{' '}
              <Link to="/legal/terminos" target="_blank" className="text-cyan hover:underline">
                términos
              </Link>{' '}
              y la{' '}
              <Link to="/legal/privacidad" target="_blank" className="text-cyan hover:underline">
                política de privacidad
              </Link>
              .
            </>
          }
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!acceptTerms}>
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(res.message);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace seguro, válido por 30 minutos y de un solo uso.">
      {sent ? (
        <div className="space-y-5 text-center">
          <MailCheck className="mx-auto size-12 text-success" strokeWidth={1.5} />
          <p className="text-fg-muted">{sent}</p>
          <Link to="/ingresar" className="text-sm font-semibold text-cyan hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} autoComplete="email" required autoFocus />
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email}>
            Enviar enlace
          </Button>
          <p className="text-center text-sm">
            <Link to="/ingresar" className="text-fg-muted hover:text-cyan">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setErrors({ confirm: 'Las contraseñas no coinciden' });
    setErrors({});
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, password } });
      toast.success('Contraseña actualizada', res.message);
      navigate('/ingresar', { replace: true });
    } catch (err) {
      const e = err as ApiError;
      setErrors(e.fields ?? {});
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Enlace inválido" subtitle="El enlace de recuperación está incompleto.">
        <Link to="/recuperar-contrasena" className="font-semibold text-cyan hover:underline">
          Solicitar un nuevo enlace
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Al cambiarla se cerrarán todas tus sesiones abiertas.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}{' '}
            {!errors.password && (
              <Link to="/recuperar-contrasena" className="font-semibold underline">
                Pedir otro enlace
              </Link>
            )}
          </p>
        )}
        <PasswordInput label="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="Mínimo 8 caracteres, con letras y números" autoComplete="new-password" required />
        <PasswordInput label="Repite la contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} autoComplete="new-password" required />
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<KeyRound className="size-4" />}>
          Guardar contraseña
        </Button>
      </form>
    </AuthShell>
  );
}
