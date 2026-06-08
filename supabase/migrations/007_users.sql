-- Public profile table that extends auth.users
CREATE TABLE users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS: users can only read their own row; admins can read all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_admin_read_all" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
