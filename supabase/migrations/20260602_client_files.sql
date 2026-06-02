create table if not exists client_files (
  id           uuid primary key default gen_random_uuid(),
  file_name    text not null,
  wasabi_key   text not null unique,
  file_size    integer,
  file_type    text,
  category     text not null default 'other'
                 check (category in ('wave_recording','sales_report','training','call_log','other')),
  notes        text,
  uploaded_by  text not null default 'KIA Motors',
  download_url text,
  created_at   timestamptz not null default now()
);

create index if not exists client_files_category_idx on client_files (category);
create index if not exists client_files_created_at_idx on client_files (created_at desc);
