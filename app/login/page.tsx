import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600">Suuper</h1>
          <p className="text-gray-500 mt-1 text-sm">Acceso admin</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
