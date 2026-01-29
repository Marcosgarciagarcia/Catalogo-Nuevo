"""
Catálogo Manager - Aplicación de Escritorio
Gestión de catálogo de libros con sincronización SQLite Local ↔ Turso Cloud
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import sqlite3
import requests
import json
from datetime import datetime
import threading
import os

class CatalogoManager:
    def __init__(self, root):
        self.root = root
        self.root.title("Catálogo Manager - SQLite Local ↔ Turso Cloud")
        self.root.geometry("1400x900")
        
        # Configuración
        self.local_db = r'C:\ProyectosDjango\casateca\db.sqlite3'
        self.turso_url = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
        self.turso_token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'
        
        self.current_libro = None
        self.autores_cache = {}
        self.editoriales_cache = {}
        
        self.create_widgets()
        self.load_initial_data()
    
    def create_widgets(self):
        """Crear interfaz gráfica"""
        
        # Frame principal con pestañas
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Pestaña 1: Búsqueda y Listado
        self.tab_busqueda = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_busqueda, text='📚 Catálogo')
        self.create_busqueda_tab()
        
        # Pestaña 2: Edición/Creación
        self.tab_edicion = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_edicion, text='✏️ Editar/Crear')
        self.create_edicion_tab()
        
        # Pestaña 3: Sincronización
        self.tab_sync = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_sync, text='🔄 Sincronización')
        self.create_sync_tab()
        
        # Pestaña 4: Estadísticas
        self.tab_stats = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_stats, text='📊 Estadísticas')
        self.create_stats_tab()
        
        # Barra de estado
        self.status_bar = tk.Label(self.root, text="Listo", bd=1, relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    def create_busqueda_tab(self):
        """Pestaña de búsqueda y listado"""
        
        # Frame superior: Búsqueda
        search_frame = ttk.LabelFrame(self.tab_busqueda, text="Búsqueda", padding=10)
        search_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Label(search_frame, text="Buscar:").grid(row=0, column=0, padx=5)
        self.search_entry = ttk.Entry(search_frame, width=40)
        self.search_entry.grid(row=0, column=1, padx=5)
        self.search_entry.bind('<Return>', lambda e: self.buscar_libros())
        
        ttk.Button(search_frame, text="🔍 Buscar", command=self.buscar_libros).grid(row=0, column=2, padx=5)
        ttk.Button(search_frame, text="🔄 Actualizar", command=self.cargar_libros).grid(row=0, column=3, padx=5)
        
        # Filtros
        ttk.Label(search_frame, text="Fuente:").grid(row=0, column=4, padx=5)
        self.source_var = tk.StringVar(value="local")
        ttk.Radiobutton(search_frame, text="Local", variable=self.source_var, value="local").grid(row=0, column=5)
        ttk.Radiobutton(search_frame, text="Turso", variable=self.source_var, value="turso").grid(row=0, column=6)
        
        # Frame medio: Lista de libros
        list_frame = ttk.LabelFrame(self.tab_busqueda, text="Libros", padding=10)
        list_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Treeview con scrollbar
        tree_scroll = ttk.Scrollbar(list_frame)
        tree_scroll.pack(side='right', fill='y')
        
        self.tree = ttk.Treeview(list_frame, yscrollcommand=tree_scroll.set, 
                                 columns=('ID', 'EAN', 'Titulo', 'Autor', 'Editorial', 'Año'),
                                 show='tree headings', height=20)
        tree_scroll.config(command=self.tree.yview)
        
        # Configurar columnas
        self.tree.column('#0', width=0, stretch=False)
        self.tree.column('ID', width=50, anchor='center')
        self.tree.column('EAN', width=120, anchor='center')
        self.tree.column('Titulo', width=400)
        self.tree.column('Autor', width=200)
        self.tree.column('Editorial', width=200)
        self.tree.column('Año', width=80, anchor='center')
        
        self.tree.heading('ID', text='ID')
        self.tree.heading('EAN', text='EAN')
        self.tree.heading('Titulo', text='Título')
        self.tree.heading('Autor', text='Autor')
        self.tree.heading('Editorial', text='Editorial')
        self.tree.heading('Año', text='Año')
        
        self.tree.pack(fill='both', expand=True)
        self.tree.bind('<Double-1>', self.on_libro_select)
        
        # Frame inferior: Acciones
        actions_frame = ttk.Frame(self.tab_busqueda)
        actions_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(actions_frame, text="✏️ Editar", command=self.editar_libro_seleccionado).pack(side='left', padx=5)
        ttk.Button(actions_frame, text="🗑️ Eliminar", command=self.eliminar_libro).pack(side='left', padx=5)
        ttk.Button(actions_frame, text="➕ Nuevo", command=self.nuevo_libro).pack(side='left', padx=5)
    
    def create_edicion_tab(self):
        """Pestaña de edición/creación"""
        
        # Frame con scroll
        canvas = tk.Canvas(self.tab_edicion)
        scrollbar = ttk.Scrollbar(self.tab_edicion, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Campos del formulario
        form_frame = ttk.LabelFrame(scrollable_frame, text="Datos del Libro", padding=20)
        form_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        row = 0
        
        # ID (solo lectura)
        ttk.Label(form_frame, text="ID:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.id_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.id_var, state='readonly', width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # EAN
        ttk.Label(form_frame, text="EAN:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.ean_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.ean_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Título
        ttk.Label(form_frame, text="Título:*").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.titulo_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.titulo_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Título Original
        ttk.Label(form_frame, text="Título Original:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.titulo_orig_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.titulo_orig_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Autor
        ttk.Label(form_frame, text="Autor:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.autor_var = tk.StringVar()
        self.autor_combo = ttk.Combobox(form_frame, textvariable=self.autor_var, width=47)
        self.autor_combo.grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Editorial
        ttk.Label(form_frame, text="Editorial:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.editorial_var = tk.StringVar()
        self.editorial_combo = ttk.Combobox(form_frame, textvariable=self.editorial_var, width=47)
        self.editorial_combo.grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Año Publicación
        ttk.Label(form_frame, text="Año Publicación:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.ano_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.ano_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Número de Páginas
        ttk.Label(form_frame, text="Nº Páginas:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.paginas_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.paginas_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # ISBN
        ttk.Label(form_frame, text="ISBN:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.isbn_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.isbn_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Portada Cloudinary
        ttk.Label(form_frame, text="URL Cloudinary:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.cloudinary_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.cloudinary_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Sinopsis
        ttk.Label(form_frame, text="Sinopsis:").grid(row=row, column=0, sticky='ne', padx=5, pady=5)
        self.sinopsis_text = scrolledtext.ScrolledText(form_frame, width=50, height=8)
        self.sinopsis_text.grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Botones de acción
        button_frame = ttk.Frame(form_frame)
        button_frame.grid(row=row, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="💾 Guardar en Local", command=lambda: self.guardar_libro('local')).pack(side='left', padx=5)
        ttk.Button(button_frame, text="☁️ Guardar en Turso", command=lambda: self.guardar_libro('turso')).pack(side='left', padx=5)
        ttk.Button(button_frame, text="💾☁️ Guardar en Ambos", command=lambda: self.guardar_libro('both')).pack(side='left', padx=5)
        ttk.Button(button_frame, text="🔄 Limpiar", command=self.limpiar_formulario).pack(side='left', padx=5)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def create_sync_tab(self):
        """Pestaña de sincronización"""
        
        # Frame de opciones
        options_frame = ttk.LabelFrame(self.tab_sync, text="Opciones de Sincronización", padding=20)
        options_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Button(options_frame, text="⬆️ Local → Turso", 
                  command=lambda: self.sincronizar('to_turso'), 
                  width=25).pack(pady=5)
        
        ttk.Button(options_frame, text="⬇️ Turso → Local", 
                  command=lambda: self.sincronizar('from_turso'), 
                  width=25).pack(pady=5)
        
        ttk.Button(options_frame, text="🔄 Sincronización Bidireccional", 
                  command=lambda: self.sincronizar('bidirectional'), 
                  width=25).pack(pady=5)
        
        ttk.Separator(options_frame, orient='horizontal').pack(fill='x', pady=10)
        
        ttk.Button(options_frame, text="👁️ Ver Diferencias (Dry Run)", 
                  command=self.ver_diferencias, 
                  width=25).pack(pady=5)
        
        # Frame de log
        log_frame = ttk.LabelFrame(self.tab_sync, text="Log de Sincronización", padding=10)
        log_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        self.sync_log = scrolledtext.ScrolledText(log_frame, height=25, state='disabled')
        self.sync_log.pack(fill='both', expand=True)
        
        # Botón para limpiar log
        ttk.Button(log_frame, text="🗑️ Limpiar Log", command=self.limpiar_log).pack(pady=5)
    
    def create_stats_tab(self):
        """Pestaña de estadísticas"""
        
        stats_frame = ttk.Frame(self.tab_stats, padding=20)
        stats_frame.pack(fill='both', expand=True)
        
        # Frame para estadísticas locales
        local_frame = ttk.LabelFrame(stats_frame, text="📁 Base de Datos Local", padding=15)
        local_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        self.local_stats_text = scrolledtext.ScrolledText(local_frame, height=15, state='disabled')
        self.local_stats_text.pack(fill='both', expand=True)
        
        # Frame para estadísticas de Turso
        turso_frame = ttk.LabelFrame(stats_frame, text="☁️ Base de Datos Turso", padding=15)
        turso_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        self.turso_stats_text = scrolledtext.ScrolledText(turso_frame, height=15, state='disabled')
        self.turso_stats_text.pack(fill='both', expand=True)
        
        # Botón para actualizar estadísticas
        ttk.Button(stats_frame, text="🔄 Actualizar Estadísticas", 
                  command=self.actualizar_estadisticas).pack(pady=10)
    
    # ==================== FUNCIONES DE BASE DE DATOS ====================
    
    def query_local(self, sql, params=()):
        """Ejecutar query en SQLite local"""
        try:
            conn = sqlite3.connect(self.local_db)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, params)
            
            if sql.strip().upper().startswith('SELECT'):
                result = cursor.fetchall()
                conn.close()
                return result
            else:
                conn.commit()
                conn.close()
                return True
        except Exception as e:
            self.log(f"❌ Error en BD local: {str(e)}")
            return None
    
    def query_turso(self, sql, params=None):
        """Ejecutar query en Turso"""
        try:
            headers = {
                'Authorization': f'Bearer {self.turso_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'statements': [{
                    'q': sql,
                    'params': params or []
                }]
            }
            
            response = requests.post(self.turso_url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Verificar si hay error
                    if 'error' in data[0]:
                        self.log(f"❌ Error Turso: {data[0]['error']}")
                        return None
                    
                    results = data[0].get('results', {})
                    rows = results.get('rows', [])
                    columns = results.get('columns', [])
                    
                    # Convertir a formato similar a sqlite3.Row
                    result = []
                    for row in rows:
                        result.append(dict(zip(columns, row)))
                    return result
            return None
        except Exception as e:
            self.log(f"❌ Error en Turso: {str(e)}")
            return None
    
    # ==================== FUNCIONES DE INTERFAZ ====================
    
    def load_initial_data(self):
        """Cargar datos iniciales"""
        self.cargar_autores()
        self.cargar_editoriales()
        self.cargar_libros()
        self.actualizar_estadisticas()
    
    def cargar_autores(self):
        """Cargar lista de autores"""
        source = self.source_var.get()
        
        if source == 'local':
            rows = self.query_local("SELECT id, nombreAutor FROM core_autores ORDER BY nombreAutor")
        else:
            rows = self.query_turso("SELECT id, nombreAutor FROM core_autores ORDER BY nombreAutor")
        
        if rows:
            self.autores_cache = {row['nombreAutor']: row['id'] for row in rows}
            self.autor_combo['values'] = list(self.autores_cache.keys())
    
    def cargar_editoriales(self):
        """Cargar lista de editoriales"""
        source = self.source_var.get()
        
        if source == 'local':
            rows = self.query_local("SELECT id, descriEditorial FROM core_editoriales ORDER BY descriEditorial")
        else:
            rows = self.query_turso("SELECT id, descriEditorial FROM core_editoriales ORDER BY descriEditorial")
        
        if rows:
            self.editoriales_cache = {row['descriEditorial']: row['id'] for row in rows}
            self.editorial_combo['values'] = list(self.editoriales_cache.keys())
    
    def cargar_libros(self):
        """Cargar lista de libros"""
        self.tree.delete(*self.tree.get_children())
        source = self.source_var.get()
        
        sql = """
            SELECT 
                t.id, t.EAN, t.titulo,
                a.nombreAutor, e.descriEditorial, t.anyoEdicion
            FROM core_titulos t
            LEFT JOIN core_autores a ON t.codiAutor_id = a.id
            LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
            ORDER BY t.titulo
            LIMIT 500
        """
        
        if source == 'local':
            rows = self.query_local(sql)
        else:
            rows = self.query_turso(sql)
        
        if rows:
            for row in rows:
                self.tree.insert('', 'end', values=(
                    row['id'],
                    row['EAN'] or '',
                    row['titulo'],
                    row['nombreAutor'] or '',
                    row['descriEditorial'] or '',
                    row['anyoEdicion'] or ''
                ))
            
            self.status_bar.config(text=f"✅ {len(rows)} libros cargados desde {source.upper()}")
    
    def buscar_libros(self):
        """Buscar libros por título o autor"""
        search_term = self.search_entry.get()
        if not search_term:
            self.cargar_libros()
            return
        
        self.tree.delete(*self.tree.get_children())
        source = self.source_var.get()
        
        sql = """
            SELECT 
                t.id, t.EAN, t.titulo,
                a.nombreAutor, e.descriEditorial, t.anyoEdicion
            FROM core_titulos t
            LEFT JOIN core_autores a ON t.codiAutor_id = a.id
            LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
            WHERE t.titulo LIKE ? OR a.nombreAutor LIKE ?
            ORDER BY t.titulo
            LIMIT 100
        """
        
        search_pattern = f'%{search_term}%'
        
        if source == 'local':
            rows = self.query_local(sql, (search_pattern, search_pattern))
        else:
            rows = self.query_turso(sql, [search_pattern, search_pattern])
        
        if rows:
            for row in rows:
                self.tree.insert('', 'end', values=(
                    row['id'],
                    row['EAN'] or '',
                    row['titulo'],
                    row['nombreAutor'] or '',
                    row['descriEditorial'] or '',
                    row['anyoEdicion'] or ''
                ))
            
            self.status_bar.config(text=f"✅ {len(rows)} resultados encontrados")
        else:
            self.status_bar.config(text="❌ No se encontraron resultados")
    
    def on_libro_select(self, event):
        """Evento de doble clic en libro"""
        self.editar_libro_seleccionado()
    
    def editar_libro_seleccionado(self):
        """Editar el libro seleccionado"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un libro primero")
            return
        
        item = self.tree.item(selection[0])
        libro_id = item['values'][0]
        
        source = self.source_var.get()
        
        sql = """
            SELECT * FROM core_titulos WHERE id = ?
        """
        
        if source == 'local':
            rows = self.query_local(sql, (libro_id,))
        else:
            rows = self.query_turso(sql, [libro_id])
        
        if rows:
            libro = rows[0]
            self.cargar_libro_en_formulario(libro)
            self.notebook.select(1)  # Cambiar a pestaña de edición
    
    def cargar_libro_en_formulario(self, libro):
        """Cargar datos del libro en el formulario"""
        self.current_libro = libro
        
        self.id_var.set(libro.get('id', ''))
        self.ean_var.set(libro.get('EAN', ''))
        self.titulo_var.set(libro.get('Titulo', ''))
        self.titulo_orig_var.set(libro.get('TituloOriginal', ''))
        self.ano_var.set(libro.get('AnoPublicacion', ''))
        self.paginas_var.set(libro.get('NumPaginas', ''))
        self.isbn_var.set(libro.get('ISBN', ''))
        self.cloudinary_var.set(libro.get('portada_cloudinary', ''))
        
        # Cargar sinopsis
        self.sinopsis_text.delete('1.0', tk.END)
        if libro.get('Sinopsis'):
            self.sinopsis_text.insert('1.0', libro['Sinopsis'])
        
        # Cargar autor
        autor_id = libro.get('codiAutor_id')
        if autor_id:
            for nombre, id_autor in self.autores_cache.items():
                if id_autor == autor_id:
                    self.autor_var.set(nombre)
                    break
        
        # Cargar editorial
        editorial_id = libro.get('codiEditorial_id')
        if editorial_id:
            for nombre, id_editorial in self.editoriales_cache.items():
                if id_editorial == editorial_id:
                    self.editorial_var.set(nombre)
                    break
    
    def nuevo_libro(self):
        """Crear nuevo libro"""
        self.limpiar_formulario()
        self.notebook.select(1)
    
    def limpiar_formulario(self):
        """Limpiar formulario de edición"""
        self.current_libro = None
        self.id_var.set('')
        self.ean_var.set('')
        self.titulo_var.set('')
        self.titulo_orig_var.set('')
        self.autor_var.set('')
        self.editorial_var.set('')
        self.ano_var.set('')
        self.paginas_var.set('')
        self.isbn_var.set('')
        self.cloudinary_var.set('')
        self.sinopsis_text.delete('1.0', tk.END)
    
    def guardar_libro(self, destino):
        """Guardar libro en local, turso o ambos"""
        # Validar campos requeridos
        if not self.titulo_var.get():
            messagebox.showerror("Error", "El título es obligatorio")
            return
        
        # Obtener IDs de autor y editorial
        autor_id = self.autores_cache.get(self.autor_var.get())
        editorial_id = self.editoriales_cache.get(self.editorial_var.get())
        
        # Preparar datos
        datos = {
            'EAN': self.ean_var.get() or None,
            'Titulo': self.titulo_var.get(),
            'TituloOriginal': self.titulo_orig_var.get() or None,
            'codiAutor_id': autor_id,
            'codiEditorial_id': editorial_id,
            'AnoPublicacion': self.ano_var.get() or None,
            'NumPaginas': int(self.paginas_var.get()) if self.paginas_var.get() else None,
            'ISBN': self.isbn_var.get() or None,
            'portada_cloudinary': self.cloudinary_var.get() or None,
            'Sinopsis': self.sinopsis_text.get('1.0', tk.END).strip() or None,
            'updated': datetime.now().isoformat()
        }
        
        libro_id = self.id_var.get()
        
        if libro_id:
            # Actualizar
            if destino in ['local', 'both']:
                self.actualizar_libro_local(libro_id, datos)
            if destino in ['turso', 'both']:
                self.actualizar_libro_turso(libro_id, datos)
        else:
            # Crear nuevo
            datos['created'] = datetime.now().isoformat()
            if destino in ['local', 'both']:
                self.crear_libro_local(datos)
            if destino in ['turso', 'both']:
                self.crear_libro_turso(datos)
        
        messagebox.showinfo("Éxito", f"Libro guardado en {destino.upper()}")
        self.cargar_libros()
    
    def actualizar_libro_local(self, libro_id, datos):
        """Actualizar libro en BD local"""
        sql = """
            UPDATE core_titulos SET
                EAN = ?, Titulo = ?, TituloOriginal = ?,
                codiAutor_id = ?, codiEditorial_id = ?,
                AnoPublicacion = ?, NumPaginas = ?,
                ISBN = ?, portada_cloudinary = ?,
                Sinopsis = ?, updated = ?
            WHERE id = ?
        """
        params = (
            datos['EAN'], datos['Titulo'], datos['TituloOriginal'],
            datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['AnoPublicacion'], datos['NumPaginas'],
            datos['ISBN'], datos['portada_cloudinary'],
            datos['Sinopsis'], datos['updated'], libro_id
        )
        self.query_local(sql, params)
    
    def actualizar_libro_turso(self, libro_id, datos):
        """Actualizar libro en Turso"""
        sql = """
            UPDATE core_titulos SET
                EAN = ?, Titulo = ?, TituloOriginal = ?,
                codiAutor_id = ?, codiEditorial_id = ?,
                AnoPublicacion = ?, NumPaginas = ?,
                ISBN = ?, portada_cloudinary = ?,
                Sinopsis = ?, updated = ?
            WHERE id = ?
        """
        params = [
            datos['EAN'], datos['Titulo'], datos['TituloOriginal'],
            datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['AnoPublicacion'], datos['NumPaginas'],
            datos['ISBN'], datos['portada_cloudinary'],
            datos['Sinopsis'], datos['updated'], int(libro_id)
        ]
        self.query_turso(sql, params)
    
    def crear_libro_local(self, datos):
        """Crear libro en BD local"""
        sql = """
            INSERT INTO core_titulos (
                EAN, Titulo, TituloOriginal, codiAutor_id, codiEditorial_id,
                AnoPublicacion, NumPaginas, ISBN, portada_cloudinary,
                Sinopsis, created, updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            datos['EAN'], datos['Titulo'], datos['TituloOriginal'],
            datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['AnoPublicacion'], datos['NumPaginas'],
            datos['ISBN'], datos['portada_cloudinary'],
            datos['Sinopsis'], datos['created'], datos['updated']
        )
        self.query_local(sql, params)
    
    def crear_libro_turso(self, datos):
        """Crear libro en Turso"""
        sql = """
            INSERT INTO core_titulos (
                EAN, Titulo, TituloOriginal, codiAutor_id, codiEditorial_id,
                AnoPublicacion, NumPaginas, ISBN, portada_cloudinary,
                Sinopsis, created, updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = [
            datos['EAN'], datos['Titulo'], datos['TituloOriginal'],
            datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['AnoPublicacion'], datos['NumPaginas'],
            datos['ISBN'], datos['portada_cloudinary'],
            datos['Sinopsis'], datos['created'], datos['updated']
        ]
        self.query_turso(sql, params)
    
    def eliminar_libro(self):
        """Eliminar libro seleccionado"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un libro primero")
            return
        
        item = self.tree.item(selection[0])
        libro_id = item['values'][0]
        titulo = item['values'][2]
        
        if not messagebox.askyesno("Confirmar", f"¿Eliminar '{titulo}'?"):
            return
        
        source = self.source_var.get()
        
        if source == 'local':
            self.query_local("DELETE FROM core_titulos WHERE id = ?", (libro_id,))
        else:
            self.query_turso("DELETE FROM core_titulos WHERE id = ?", [libro_id])
        
        messagebox.showinfo("Éxito", "Libro eliminado")
        self.cargar_libros()
    
    # ==================== FUNCIONES DE SINCRONIZACIÓN ====================
    
    def sincronizar(self, direccion):
        """Sincronizar bases de datos"""
        self.log(f"\n{'='*60}")
        self.log(f"Iniciando sincronización: {direccion}")
        self.log(f"{'='*60}\n")
        
        def sync_thread():
            try:
                if direccion == 'to_turso':
                    self.sync_local_to_turso()
                elif direccion == 'from_turso':
                    self.sync_turso_to_local()
                elif direccion == 'bidirectional':
                    self.sync_bidirectional()
                
                self.log("\n✅ Sincronización completada")
                self.root.after(0, self.actualizar_estadisticas)
            except Exception as e:
                self.log(f"\n❌ Error en sincronización: {str(e)}")
        
        threading.Thread(target=sync_thread, daemon=True).start()
    
    def sync_local_to_turso(self):
        """Sincronizar de local a Turso"""
        self.log("📤 Sincronizando Local → Turso...")
        
        # Primero sincronizar autores
        self.log("\n👤 Sincronizando autores...")
        local_autores = self.query_local("SELECT * FROM core_autores")
        autores_synced = 0
        
        for autor in local_autores:
            turso_autor = self.query_turso("SELECT id FROM core_autores WHERE id = ?", [autor['id']])
            if not turso_autor:
                created = autor['created'] or datetime.now().isoformat()
                updated = autor['updated'] or datetime.now().isoformat()
                sql = "INSERT INTO core_autores (id, nombreAutor, created, updated) VALUES (?, ?, ?, ?)"
                self.query_turso(sql, [autor['id'], autor['nombreAutor'], created, updated])
                self.log(f"  ➕ Autor creado: {autor['nombreAutor']}")
                autores_synced += 1
        
        if autores_synced > 0:
            self.log(f"✅ {autores_synced} autores sincronizados")
        
        # Luego sincronizar editoriales
        self.log("\n🏢 Sincronizando editoriales...")
        local_editoriales = self.query_local("SELECT * FROM core_editoriales")
        editoriales_synced = 0
        
        for editorial in local_editoriales:
            turso_editorial = self.query_turso("SELECT id FROM core_editoriales WHERE id = ?", [editorial['id']])
            if not turso_editorial:
                created = editorial['created'] or datetime.now().isoformat()
                updated = editorial['updated'] or datetime.now().isoformat()
                sql = "INSERT INTO core_editoriales (id, descriEditorial, created, updated) VALUES (?, ?, ?, ?)"
                self.query_turso(sql, [editorial['id'], editorial['descriEditorial'], created, updated])
                self.log(f"  ➕ Editorial creada: {editorial['descriEditorial']}")
                editoriales_synced += 1
        
        if editoriales_synced > 0:
            self.log(f"✅ {editoriales_synced} editoriales sincronizadas")
        
        # Finalmente sincronizar libros
        self.log("\n📚 Sincronizando libros...")
        local_books = self.query_local("""
            SELECT * FROM core_titulos 
            ORDER BY updated DESC
        """)
        
        if not local_books:
            self.log("No hay libros para sincronizar")
            return
        
        created_count = 0
        updated_count = 0
        skipped = 0
        
        for book in local_books:
            # Verificar si existe en Turso
            turso_book = self.query_turso("SELECT id, updated FROM core_titulos WHERE id = ?", [book['id']])
            
            if not turso_book:
                # No existe, crear con TODOS los campos
                created = book['created'] or datetime.now().isoformat()
                updated = book['updated'] or datetime.now().isoformat()
                
                sql = """
                    INSERT INTO core_titulos (
                        id, EAN, titulo, numeroEdicion, anyoEdicion, numeroPaginas,
                        tituloOriginal, portada, numeroEjemplares, created, updated,
                        codiAutor_id, codiGenero_id, codiSoporte_id, codiUbicacion_id,
                        coleccion, contraportada, codiEstante_id, serie, codiEditorial_id,
                        sinopsis, observaciones, portada_cloudinary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                params = [
                    book['id'], book['EAN'], book['titulo'],
                    book['numeroEdicion'] or 1,  # Default 1 si es NULL
                    book['anyoEdicion'], book['numeroPaginas'],
                    book['tituloOriginal'], book['portada'], book['numeroEjemplares'],
                    created, updated,
                    book['codiAutor_id'], book['codiGenero_id'], book['codiSoporte_id'],
                    book['codiUbicacion_id'], book['coleccion'], book['contraportada'],
                    book['codiEstante_id'], book['serie'], book['codiEditorial_id'],
                    book['sinopsis'], book['observaciones'], book['portada_cloudinary']
                ]
                result = self.query_turso(sql, params)
                if result is not None:
                    self.log(f"  ➕ Creado: {book['titulo']}")
                    created_count += 1
            else:
                # Comparar fechas de actualización
                local_updated = book['updated'] or ''
                turso_updated = turso_book[0].get('updated', '') or ''
                
                if local_updated > turso_updated:
                    # Actualizar si local es más reciente
                    sql = """
                        UPDATE core_titulos SET
                            EAN = ?, titulo = ?, tituloOriginal = ?,
                            codiAutor_id = ?, codiEditorial_id = ?,
                            anyoEdicion = ?, numeroPaginas = ?,
                            portada_cloudinary = ?,
                            sinopsis = ?, updated = ?
                        WHERE id = ?
                    """
                    params = [
                        book['EAN'], book['titulo'], book['tituloOriginal'],
                        book['codiAutor_id'], book['codiEditorial_id'],
                        book['anyoEdicion'], book['numeroPaginas'],
                        book['portada_cloudinary'],
                        book['sinopsis'], book['updated'], book['id']
                    ]
                    result = self.query_turso(sql, params)
                    if result is not None:
                        self.log(f"  🔄 Actualizado: {book['titulo']}")
                        updated_count += 1
                else:
                    skipped += 1
        
        self.log(f"\n✅ Sincronización completada:")
        self.log(f"   ➕ {created_count} libros creados")
        self.log(f"   🔄 {updated_count} libros actualizados")
        self.log(f"   ⏭️  {skipped} libros sin cambios")
    
    def sync_turso_to_local(self):
        """Sincronizar de Turso a local"""
        self.log("📥 Sincronizando Turso → Local...")
        
        # Sincronizar autores
        self.log("\n👤 Sincronizando autores...")
        turso_autores = self.query_turso("SELECT * FROM core_autores")
        autores_synced = 0
        
        if turso_autores:
            for autor in turso_autores:
                local_autor = self.query_local("SELECT id FROM core_autores WHERE id = ?", (autor['id'],))
                if not local_autor:
                    created = autor.get('created') or datetime.now().isoformat()
                    updated = autor.get('updated') or datetime.now().isoformat()
                    sql = "INSERT INTO core_autores (id, nombreAutor, created, updated) VALUES (?, ?, ?, ?)"
                    self.query_local(sql, (autor['id'], autor['nombreAutor'], created, updated))
                    self.log(f"  ➕ Autor creado: {autor['nombreAutor']}")
                    autores_synced += 1
        
        if autores_synced > 0:
            self.log(f"✅ {autores_synced} autores sincronizados")
        
        # Sincronizar editoriales
        self.log("\n🏢 Sincronizando editoriales...")
        turso_editoriales = self.query_turso("SELECT * FROM core_editoriales")
        editoriales_synced = 0
        
        if turso_editoriales:
            for editorial in turso_editoriales:
                local_editorial = self.query_local("SELECT id FROM core_editoriales WHERE id = ?", (editorial['id'],))
                if not local_editorial:
                    created = editorial.get('created') or datetime.now().isoformat()
                    updated = editorial.get('updated') or datetime.now().isoformat()
                    sql = "INSERT INTO core_editoriales (id, descriEditorial, created, updated) VALUES (?, ?, ?, ?)"
                    self.query_local(sql, (editorial['id'], editorial['descriEditorial'], created, updated))
                    self.log(f"  ➕ Editorial creada: {editorial['descriEditorial']}")
                    editoriales_synced += 1
        
        if editoriales_synced > 0:
            self.log(f"✅ {editoriales_synced} editoriales sincronizadas")
        
        # Sincronizar libros
        self.log("\n📚 Sincronizando libros...")
        turso_books = self.query_turso("SELECT * FROM core_titulos ORDER BY updated DESC")
        
        if not turso_books:
            self.log("No hay libros para sincronizar")
            return
        
        created_count = 0
        updated_count = 0
        skipped = 0
        
        for book in turso_books:
            local_book = self.query_local("SELECT id, updated FROM core_titulos WHERE id = ?", (book['id'],))
            
            if not local_book:
                # No existe, crear con todos los campos
                sql = """
                    INSERT INTO core_titulos (
                        id, EAN, titulo, numeroEdicion, anyoEdicion, numeroPaginas,
                        tituloOriginal, portada, numeroEjemplares, created, updated,
                        codiAutor_id, codiGenero_id, codiSoporte_id, codiUbicacion_id,
                        coleccion, contraportada, codiEstante_id, serie, codiEditorial_id,
                        sinopsis, observaciones, portada_cloudinary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                params = (
                    book['id'], book['EAN'], book['titulo'],
                    book['numeroEdicion'], book['anyoEdicion'], book['numeroPaginas'],
                    book['tituloOriginal'], book['portada'], book['numeroEjemplares'],
                    book['created'], book['updated'],
                    book['codiAutor_id'], book['codiGenero_id'], book['codiSoporte_id'],
                    book['codiUbicacion_id'], book['coleccion'], book['contraportada'],
                    book['codiEstante_id'], book['serie'], book['codiEditorial_id'],
                    book['sinopsis'], book['observaciones'], book['portada_cloudinary']
                )
                self.query_local(sql, params)
                self.log(f"  ➕ Creado: {book['titulo']}")
                created_count += 1
            else:
                # Comparar fechas
                turso_updated = book.get('updated', '') or ''
                local_updated = local_book[0]['updated'] or ''
                
                if turso_updated > local_updated:
                    sql = """
                        UPDATE core_titulos SET
                            EAN = ?, titulo = ?, tituloOriginal = ?,
                            codiAutor_id = ?, codiEditorial_id = ?,
                            anyoEdicion = ?, numeroPaginas = ?,
                            portada_cloudinary = ?,
                            sinopsis = ?, updated = ?
                        WHERE id = ?
                    """
                    params = (
                        book['EAN'], book['titulo'], book['tituloOriginal'],
                        book['codiAutor_id'], book['codiEditorial_id'],
                        book['anyoEdicion'], book['numeroPaginas'],
                        book['portada_cloudinary'],
                        book['sinopsis'], book['updated'], book['id']
                    )
                    self.query_local(sql, params)
                    self.log(f"  🔄 Actualizado: {book['titulo']}")
                    updated_count += 1
                else:
                    skipped += 1
        
        self.log(f"\n✅ Sincronización completada:")
        self.log(f"   ➕ {created_count} libros creados")
        self.log(f"   🔄 {updated_count} libros actualizados")
        self.log(f"   ⏭️  {skipped} libros sin cambios")
    
    def sync_bidirectional(self):
        """Sincronización bidireccional"""
        self.log("🔄 Sincronización bidireccional...")
        self.log("\nEsta sincronización compara ambas bases de datos y actualiza")
        self.log("cada una con los registros más recientes.\n")
        
        # Primero sincronizar de local a Turso
        self.log("\n" + "="*60)
        self.log("FASE 1: Local → Turso")
        self.log("="*60)
        self.sync_local_to_turso()
        
        # Luego sincronizar de Turso a local
        self.log("\n" + "="*60)
        self.log("FASE 2: Turso → Local")
        self.log("="*60)
        self.sync_turso_to_local()
        
        self.log("\n" + "="*60)
        self.log("✅ Sincronización bidireccional completada")
        self.log("="*60)
    
    def ver_diferencias(self):
        """Ver diferencias entre bases de datos"""
        self.log("\n👁️ Analizando diferencias...")
        
        # Contar registros
        local_count = self.query_local("SELECT COUNT(*) as count FROM core_titulos")
        turso_count = self.query_turso("SELECT COUNT(*) as count FROM core_titulos")
        
        if local_count and turso_count:
            self.log(f"  Local: {local_count[0]['count']} libros")
            self.log(f"  Turso: {turso_count[0]['count']} libros")
            diff = local_count[0]['count'] - turso_count[0]['count']
            self.log(f"  Diferencia: {diff} libros")
    
    def actualizar_estadisticas(self):
        """Actualizar estadísticas de ambas BDs"""
        # Estadísticas locales
        self.local_stats_text.config(state='normal')
        self.local_stats_text.delete('1.0', tk.END)
        
        stats_local = self.obtener_estadisticas_local()
        self.local_stats_text.insert('1.0', stats_local)
        self.local_stats_text.config(state='disabled')
        
        # Estadísticas Turso
        self.turso_stats_text.config(state='normal')
        self.turso_stats_text.delete('1.0', tk.END)
        
        stats_turso = self.obtener_estadisticas_turso()
        self.turso_stats_text.insert('1.0', stats_turso)
        self.turso_stats_text.config(state='disabled')
    
    def obtener_estadisticas_local(self):
        """Obtener estadísticas de BD local"""
        try:
            stats = []
            stats.append("📊 ESTADÍSTICAS DE BASE DE DATOS LOCAL\n")
            stats.append("="*50 + "\n\n")
            
            # Total de libros
            result = self.query_local("SELECT COUNT(*) as count FROM core_titulos")
            if result:
                stats.append(f"📚 Total de libros: {result[0]['count']}\n")
            
            # Total de autores
            result = self.query_local("SELECT COUNT(*) as count FROM core_autores")
            if result:
                stats.append(f"👤 Total de autores: {result[0]['count']}\n")
            
            # Total de editoriales
            result = self.query_local("SELECT COUNT(*) as count FROM core_editoriales")
            if result:
                stats.append(f"🏢 Total de editoriales: {result[0]['count']}\n")
            
            # Libros con imagen
            result = self.query_local("SELECT COUNT(*) as count FROM core_titulos WHERE portada_cloudinary IS NOT NULL")
            if result:
                stats.append(f"🖼️  Libros con imagen: {result[0]['count']}\n")
            
            stats.append(f"\n📁 Ruta: {self.local_db}\n")
            
            return ''.join(stats)
        except Exception as e:
            return f"❌ Error obteniendo estadísticas: {str(e)}"
    
    def obtener_estadisticas_turso(self):
        """Obtener estadísticas de Turso"""
        try:
            stats = []
            stats.append("📊 ESTADÍSTICAS DE BASE DE DATOS TURSO\n")
            stats.append("="*50 + "\n\n")
            
            # Total de libros
            result = self.query_turso("SELECT COUNT(*) as count FROM core_titulos")
            if result:
                stats.append(f"📚 Total de libros: {result[0]['count']}\n")
            
            # Total de autores
            result = self.query_turso("SELECT COUNT(*) as count FROM core_autores")
            if result:
                stats.append(f"👤 Total de autores: {result[0]['count']}\n")
            
            # Total de editoriales
            result = self.query_turso("SELECT COUNT(*) as count FROM core_editoriales")
            if result:
                stats.append(f"🏢 Total de editoriales: {result[0]['count']}\n")
            
            # Libros con imagen
            result = self.query_turso("SELECT COUNT(*) as count FROM core_titulos WHERE portada_cloudinary IS NOT NULL")
            if result:
                stats.append(f"🖼️  Libros con imagen: {result[0]['count']}\n")
            
            stats.append(f"\n☁️  URL: {self.turso_url}\n")
            
            return ''.join(stats)
        except Exception as e:
            return f"❌ Error obteniendo estadísticas: {str(e)}"
    
    def log(self, message):
        """Añadir mensaje al log de sincronización"""
        self.sync_log.config(state='normal')
        self.sync_log.insert(tk.END, message + '\n')
        self.sync_log.see(tk.END)
        self.sync_log.config(state='disabled')
    
    def limpiar_log(self):
        """Limpiar log de sincronización"""
        self.sync_log.config(state='normal')
        self.sync_log.delete('1.0', tk.END)
        self.sync_log.config(state='disabled')

# ==================== MAIN ====================

if __name__ == "__main__":
    root = tk.Tk()
    app = CatalogoManager(root)
    root.mainloop()
