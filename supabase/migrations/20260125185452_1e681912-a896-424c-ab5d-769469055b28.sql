-- Create research phase enum
CREATE TYPE research_phase AS ENUM (
  'planning', 'searching', 'browsing', 
  'extracting', 'validating', 'generating', 'completed', 'failed'
);

-- Create research_tasks table for agent execution state
CREATE TABLE public.research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  plan JSONB DEFAULT '[]'::jsonb,
  execution_steps JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  final_answer TEXT,
  phase research_phase DEFAULT 'planning',
  credits_used INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create research_sources table for citations
CREATE TABLE public.research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.research_tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  snippet TEXT,
  content TEXT,
  source_type TEXT CHECK (source_type IN ('search', 'scrape', 'crawl')),
  relevance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for research_tasks
CREATE POLICY "Users can view their own research tasks"
  ON public.research_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research tasks"
  ON public.research_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research tasks"
  ON public.research_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research tasks"
  ON public.research_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for research_sources (access via task ownership)
CREATE POLICY "Users can view sources of their tasks"
  ON public.research_sources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.research_tasks 
    WHERE research_tasks.id = research_sources.task_id 
    AND research_tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create sources for their tasks"
  ON public.research_sources FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.research_tasks 
    WHERE research_tasks.id = research_sources.task_id 
    AND research_tasks.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_research_tasks_user_id ON public.research_tasks(user_id);
CREATE INDEX idx_research_tasks_conversation_id ON public.research_tasks(conversation_id);
CREATE INDEX idx_research_tasks_phase ON public.research_tasks(phase);
CREATE INDEX idx_research_sources_task_id ON public.research_sources(task_id);