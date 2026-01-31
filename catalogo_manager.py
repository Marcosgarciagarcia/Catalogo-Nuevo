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
import webbrowser

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
        
        # Pestaña 3: Gestión de Autores
        self.tab_autores = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_autores, text='👤 Autores')
        self.create_autores_tab()
        
        # Pestaña 4: Gestión de Editoriales
        self.tab_editoriales = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_editoriales, text='🏢 Editoriales')
        self.create_editoriales_tab()
        
        # Pestaña 5: Gestión de Usuarios
        self.tab_usuarios = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_usuarios, text='👥 Usuarios')
        self.create_usuarios_tab()
        
        # Pestaña 6: Sincronización
        self.tab_sync = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_sync, text='🔄 Sincronización')
        self.create_sync_tab()
        
        # Pestaña 6: Estadísticas
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
        
        # Número de Edición
        ttk.Label(form_frame, text="Nº Edición:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.num_edicion_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.num_edicion_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Año Edición
        ttk.Label(form_frame, text="Año Edición:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.ano_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.ano_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Número de Páginas
        ttk.Label(form_frame, text="Nº Páginas:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.paginas_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.paginas_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Número de Ejemplares
        ttk.Label(form_frame, text="Nº Ejemplares:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.num_ejemplares_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.num_ejemplares_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # ISBN
        ttk.Label(form_frame, text="ISBN:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.isbn_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.isbn_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Colección
        ttk.Label(form_frame, text="Colección:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.coleccion_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.coleccion_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Serie
        ttk.Label(form_frame, text="Serie:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.serie_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.serie_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Portada Cloudinary
        ttk.Label(form_frame, text="URL Cloudinary:").grid(row=row, column=0, sticky='e', padx=5, pady=5)
        self.cloudinary_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.cloudinary_var, width=50).grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Sinopsis
        ttk.Label(form_frame, text="Sinopsis:").grid(row=row, column=0, sticky='ne', padx=5, pady=5)
        self.sinopsis_text = scrolledtext.ScrolledText(form_frame, width=50, height=6)
        self.sinopsis_text.grid(row=row, column=1, sticky='w', padx=5, pady=5)
        row += 1
        
        # Observaciones
        ttk.Label(form_frame, text="Observaciones:").grid(row=row, column=0, sticky='ne', padx=5, pady=5)
        self.observaciones_text = scrolledtext.ScrolledText(form_frame, width=50, height=4)
        self.observaciones_text.grid(row=row, column=1, sticky='w', padx=5, pady=5)
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
        
        ttk.Button(options_frame, text="🔄 Sincronización Bidireccional (Rápida)", 
                  command=lambda: self.sincronizar('bidirectional'), 
                  width=35).pack(pady=5)
        
        ttk.Separator(options_frame, orient='horizontal').pack(fill='x', pady=10)
        
        ttk.Label(options_frame, text="⚠️ Sincronización Administrativa (Lenta)", 
                 font=('Arial', 9, 'bold')).pack(pady=5)
        
        ttk.Button(options_frame, text="🔄 Sincronización Completa (Todos los Registros)", 
                  command=lambda: self.sincronizar('full_sync'), 
                  width=50, 
                  style='Accent.TButton').pack(pady=5)
        
        ttk.Separator(options_frame, orient='horizontal').pack(fill='x', pady=10)
        
        ttk.Button(options_frame, text="👁️ Ver Diferencias (Dry Run)", 
                  command=self.ver_diferencias, 
                  width=35).pack(pady=5)
        
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
    
    def create_autores_tab(self):
        """Pestaña de gestión de autores"""
        
        # Frame principal
        main_frame = ttk.Frame(self.tab_autores, padding=10)
        main_frame.pack(fill='both', expand=True)
        
        # Frame superior: Búsqueda y botones
        top_frame = ttk.Frame(main_frame)
        top_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(top_frame, text="Buscar autor:").pack(side='left', padx=5)
        self.autor_search_var = tk.StringVar()
        autor_search_entry = ttk.Entry(top_frame, textvariable=self.autor_search_var, width=30)
        autor_search_entry.pack(side='left', padx=5)
        autor_search_entry.bind('<KeyRelease>', lambda e: self.buscar_autores())
        
        ttk.Button(top_frame, text="🔍 Buscar", command=self.buscar_autores).pack(side='left', padx=5)
        ttk.Button(top_frame, text="➕ Nuevo Autor", command=self.crear_nuevo_autor).pack(side='left', padx=5)
        ttk.Button(top_frame, text="🔄 Recargar", command=self.buscar_autores).pack(side='left', padx=5)
        
        # Frame para lista de autores
        list_frame = ttk.LabelFrame(main_frame, text="Lista de Autores", padding=10)
        list_frame.pack(fill='both', expand=True)
        
        # Treeview para autores
        columns = ('ID', 'Nombre', 'Libros')
        self.autores_tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=15)
        
        self.autores_tree.heading('ID', text='ID')
        self.autores_tree.heading('Nombre', text='Nombre del Autor')
        self.autores_tree.heading('Libros', text='Nº Libros')
        
        self.autores_tree.column('ID', width=60, anchor='center')
        self.autores_tree.column('Nombre', width=300)
        self.autores_tree.column('Libros', width=100, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_frame, orient='vertical', command=self.autores_tree.yview)
        self.autores_tree.configure(yscrollcommand=scrollbar.set)
        
        self.autores_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble click para editar
        self.autores_tree.bind('<Double-1>', lambda e: self.editar_autor_seleccionado())
        
        # Frame inferior: Botones de acción
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill='x', pady=(10, 0))
        
        ttk.Button(button_frame, text="✏️ Editar", command=self.editar_autor_seleccionado).pack(side='left', padx=5)
        ttk.Button(button_frame, text="🗑️ Eliminar", command=self.eliminar_autor).pack(side='left', padx=5)
        
        # Cargar listado inicial
        self.root.after(100, self.buscar_autores)
    
    def create_editoriales_tab(self):
        """Pestaña de gestión de editoriales"""
        
        # Frame principal
        main_frame = ttk.Frame(self.tab_editoriales, padding=10)
        main_frame.pack(fill='both', expand=True)
        
        # Frame superior: Búsqueda y botones
        top_frame = ttk.Frame(main_frame)
        top_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(top_frame, text="Buscar editorial:").pack(side='left', padx=5)
        self.editorial_search_var = tk.StringVar()
        editorial_search_entry = ttk.Entry(top_frame, textvariable=self.editorial_search_var, width=30)
        editorial_search_entry.pack(side='left', padx=5)
        editorial_search_entry.bind('<KeyRelease>', lambda e: self.buscar_editoriales())
        
        ttk.Button(top_frame, text="🔍 Buscar", command=self.buscar_editoriales).pack(side='left', padx=5)
        ttk.Button(top_frame, text="➕ Nueva Editorial", command=self.crear_nueva_editorial).pack(side='left', padx=5)
        ttk.Button(top_frame, text="🔄 Recargar", command=self.buscar_editoriales).pack(side='left', padx=5)
        
        # Frame para lista de editoriales
        list_frame = ttk.LabelFrame(main_frame, text="Lista de Editoriales", padding=10)
        list_frame.pack(fill='both', expand=True)
        
        # Treeview para editoriales
        columns = ('ID', 'Nombre', 'Libros')
        self.editoriales_tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=15)
        
        self.editoriales_tree.heading('ID', text='ID')
        self.editoriales_tree.heading('Nombre', text='Nombre de la Editorial')
        self.editoriales_tree.heading('Libros', text='Nº Libros')
        
        self.editoriales_tree.column('ID', width=60, anchor='center')
        self.editoriales_tree.column('Nombre', width=300)
        self.editoriales_tree.column('Libros', width=100, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_frame, orient='vertical', command=self.editoriales_tree.yview)
        self.editoriales_tree.configure(yscrollcommand=scrollbar.set)
        
        self.editoriales_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble click para editar
        self.editoriales_tree.bind('<Double-1>', lambda e: self.editar_editorial_seleccionada())
        
        # Frame inferior: Botones de acción
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill='x', pady=(10, 0))
        
        ttk.Button(button_frame, text="✏️ Editar", command=self.editar_editorial_seleccionada).pack(side='left', padx=5)
        ttk.Button(button_frame, text="🗑️ Eliminar", command=self.eliminar_editorial).pack(side='left', padx=5)
        
        # Cargar listado inicial
        self.root.after(100, self.buscar_editoriales)
    
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
        if not isinstance(libro, dict):
            libro = dict(libro)
        self.current_libro = libro
        
        self.id_var.set(libro.get('id', ''))
        self.ean_var.set(libro.get('EAN', ''))
        self.titulo_var.set(libro.get('titulo', ''))
        self.titulo_orig_var.set(libro.get('tituloOriginal', ''))
        self.num_edicion_var.set(libro.get('numeroEdicion', ''))
        self.ano_var.set(libro.get('anyoEdicion', ''))
        self.paginas_var.set(libro.get('numeroPaginas', ''))
        self.num_ejemplares_var.set(libro.get('numeroEjemplares', ''))
        self.isbn_var.set(libro.get('EAN', ''))
        self.coleccion_var.set(libro.get('coleccion', ''))
        self.serie_var.set(libro.get('serie', ''))
        self.cloudinary_var.set(libro.get('portada_cloudinary', ''))
        
        # Cargar sinopsis
        self.sinopsis_text.delete('1.0', tk.END)
        if libro.get('sinopsis'):
            self.sinopsis_text.insert('1.0', libro['sinopsis'])
        
        # Cargar observaciones
        self.observaciones_text.delete('1.0', tk.END)
        if libro.get('observaciones'):
            self.observaciones_text.insert('1.0', libro['observaciones'])
        
        # Cargar autor (limpiar primero)
        self.autor_var.set('')
        autor_id = libro.get('codiAutor_id')
        if autor_id:
            for nombre, id_autor in self.autores_cache.items():
                if id_autor == autor_id:
                    self.autor_var.set(nombre)
                    break
        
        # Cargar editorial (limpiar primero)
        self.editorial_var.set('')
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
        self.num_edicion_var.set('')
        self.ano_var.set('')
        self.paginas_var.set('')
        self.num_ejemplares_var.set('')
        self.isbn_var.set('')
        self.coleccion_var.set('')
        self.serie_var.set('')
        self.cloudinary_var.set('')
        self.sinopsis_text.delete('1.0', tk.END)
        self.observaciones_text.delete('1.0', tk.END)
    
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
            'titulo': self.titulo_var.get(),
            'tituloOriginal': self.titulo_orig_var.get() or None,
            'numeroEdicion': int(self.num_edicion_var.get()) if self.num_edicion_var.get() else 1,
            'anyoEdicion': self.ano_var.get() or None,
            'numeroPaginas': int(self.paginas_var.get()) if self.paginas_var.get() else 0,
            'numeroEjemplares': int(self.num_ejemplares_var.get()) if self.num_ejemplares_var.get() else 1,
            'codiAutor_id': autor_id,
            'codiEditorial_id': editorial_id,
            'coleccion': self.coleccion_var.get() or None,
            'serie': self.serie_var.get() or None,
            'portada_cloudinary': self.cloudinary_var.get() or None,
            'sinopsis': self.sinopsis_text.get('1.0', tk.END).strip() or None,
            'observaciones': self.observaciones_text.get('1.0', tk.END).strip() or None
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
                EAN = ?, titulo = ?, tituloOriginal = ?,
                numeroEdicion = ?, anyoEdicion = ?, numeroPaginas = ?,
                numeroEjemplares = ?, codiAutor_id = ?, codiEditorial_id = ?,
                coleccion = ?, serie = ?, portada_cloudinary = ?,
                sinopsis = ?, observaciones = ?, updated = datetime('now')
            WHERE id = ?
        """
        params = (
            datos['EAN'], datos['titulo'], datos['tituloOriginal'],
            datos['numeroEdicion'], datos['anyoEdicion'], datos['numeroPaginas'],
            datos['numeroEjemplares'], datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['coleccion'], datos['serie'], datos['portada_cloudinary'],
            datos['sinopsis'], datos['observaciones'], libro_id
        )
        self.query_local(sql, params)
    
    def actualizar_libro_turso(self, libro_id, datos):
        """Actualizar libro en Turso"""
        sql = """
            UPDATE core_titulos SET
                EAN = ?, titulo = ?, tituloOriginal = ?,
                numeroEdicion = ?, anyoEdicion = ?, numeroPaginas = ?,
                numeroEjemplares = ?, codiAutor_id = ?, codiEditorial_id = ?,
                coleccion = ?, serie = ?, portada_cloudinary = ?,
                sinopsis = ?, observaciones = ?, updated = datetime('now')
            WHERE id = ?
        """
        params = [
            datos['EAN'], datos['titulo'], datos['tituloOriginal'],
            datos['numeroEdicion'], datos['anyoEdicion'], datos['numeroPaginas'],
            datos['numeroEjemplares'], datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['coleccion'], datos['serie'], datos['portada_cloudinary'],
            datos['sinopsis'], datos['observaciones'], int(libro_id)
        ]
        self.query_turso(sql, params)
    
    def crear_libro_local(self, datos):
        """Crear libro en BD local"""
        sql = """
            INSERT INTO core_titulos (
                EAN, titulo, tituloOriginal, numeroEdicion, anyoEdicion,
                numeroPaginas, numeroEjemplares, codiAutor_id, codiEditorial_id,
                coleccion, serie, portada_cloudinary, sinopsis, observaciones,
                created, updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        params = (
            datos['EAN'], datos['titulo'], datos['tituloOriginal'],
            datos['numeroEdicion'], datos['anyoEdicion'], datos['numeroPaginas'],
            datos['numeroEjemplares'], datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['coleccion'], datos['serie'], datos['portada_cloudinary'],
            datos['sinopsis'], datos['observaciones']
        )
        self.query_local(sql, params)
    
    def crear_libro_turso(self, datos):
        """Crear libro en Turso"""
        sql = """
            INSERT INTO core_titulos (
                EAN, titulo, tituloOriginal, numeroEdicion, anyoEdicion,
                numeroPaginas, numeroEjemplares, codiAutor_id, codiEditorial_id,
                coleccion, serie, portada_cloudinary, sinopsis, observaciones,
                created, updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        params = [
            datos['EAN'], datos['titulo'], datos['tituloOriginal'],
            datos['numeroEdicion'], datos['anyoEdicion'], datos['numeroPaginas'],
            datos['numeroEjemplares'], datos['codiAutor_id'], datos['codiEditorial_id'],
            datos['coleccion'], datos['serie'], datos['portada_cloudinary'],
            datos['sinopsis'], datos['observaciones']
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
                elif direccion == 'full_sync':
                    self.sync_full_bidirectional()
                
                self.log("\n✅ Sincronización completada")
                self.root.after(0, self.actualizar_estadisticas)
            except Exception as e:
                self.log(f"\n❌ Error en sincronización: {str(e)}")
        
        threading.Thread(target=sync_thread, daemon=True).start()
    
    def sync_local_to_turso(self):
        """Sincronizar de local a Turso"""
        self.log("📤 Sincronizando Local → Turso...")
        
        # Primero sincronizar usuarios
        self.log("\n👥 Sincronizando usuarios...")
        local_usuarios = self.query_local("""
            SELECT * FROM auth_user 
            WHERE date_joined >= datetime('now', '-1 day') OR date_joined IS NULL
            ORDER BY date_joined DESC
        """)
        self.log(f"   📊 Usuarios modificados recientemente: {len(local_usuarios) if local_usuarios else 0}")
        usuarios_synced = 0
        
        for idx, usuario_row in enumerate(local_usuarios, 1):
            try:
                usuario = dict(usuario_row)
                
                if idx % 10 == 0:
                    self.log(f"   🔄 Procesando usuario {idx}/{len(local_usuarios)}...")
                
                turso_usuario = self.query_turso("SELECT id FROM auth_user WHERE id = ?", [usuario['id']])
                if not turso_usuario:
                    # Insertar nuevo usuario
                    sql = """INSERT INTO auth_user (
                        id, password, last_login, is_superuser, username, first_name, 
                        last_name, email, is_staff, is_active, date_joined
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
                    result = self.query_turso(sql, [
                        usuario['id'], usuario['password'], usuario.get('last_login'),
                        usuario['is_superuser'], usuario['username'], usuario.get('first_name', ''),
                        usuario.get('last_name', ''), usuario.get('email', ''),
                        usuario['is_staff'], usuario['is_active'], usuario['date_joined']
                    ])
                    if result is not None:
                        self.log(f"  ➕ Usuario creado: {usuario['username']}")
                        usuarios_synced += 1
                else:
                    # Actualizar usuario existente
                    sql = """UPDATE auth_user SET 
                        password = ?, last_login = ?, is_superuser = ?, first_name = ?,
                        last_name = ?, email = ?, is_staff = ?, is_active = ?
                        WHERE id = ?"""
                    result = self.query_turso(sql, [
                        usuario['password'], usuario.get('last_login'), usuario['is_superuser'],
                        usuario.get('first_name', ''), usuario.get('last_name', ''),
                        usuario.get('email', ''), usuario['is_staff'], usuario['is_active'],
                        usuario['id']
                    ])
                    if result is not None:
                        self.log(f"  🔄 Usuario actualizado: {usuario['username']}")
                        usuarios_synced += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con usuario {usuario.get('username', 'desconocido') if isinstance(usuario, dict) else 'desconocido'}: {str(e)}")
                continue
        
        if usuarios_synced > 0:
            self.log(f"✅ {usuarios_synced} usuarios sincronizados")
        else:
            self.log("   ℹ️ No hay usuarios nuevos para sincronizar")
        
        # Luego sincronizar autores (solo los modificados recientemente)
        self.log("\n👤 Sincronizando autores...")
        local_autores = self.query_local("""
            SELECT * FROM core_autores 
            WHERE updated >= datetime('now', '-1 day') OR updated IS NULL
            ORDER BY updated DESC
        """)
        self.log(f"   📊 Autores modificados recientemente: {len(local_autores) if local_autores else 0}")
        autores_synced = 0
        
        for idx, autor_row in enumerate(local_autores, 1):
            try:
                # Convertir sqlite3.Row a dict
                autor = dict(autor_row)
                
                if idx % 100 == 0:
                    self.log(f"   🔄 Procesando autor {idx}/{len(local_autores)}...")
                turso_autor = self.query_turso("SELECT id FROM core_autores WHERE id = ?", [autor['id']])
                if not turso_autor:
                    created = autor.get('created') or datetime.now().isoformat()
                    updated = autor.get('updated') or datetime.now().isoformat()
                    sql = "INSERT INTO core_autores (id, nombreAutor, enlaceWiki, enlaceWiki2, created, updated) VALUES (?, ?, ?, ?, ?, ?)"
                    result = self.query_turso(sql, [autor['id'], autor['nombreAutor'], autor.get('enlaceWiki'), autor.get('enlaceWiki2'), created, updated])
                    if result is not None:
                        self.log(f"  ➕ Autor creado: {autor['nombreAutor']}")
                        autores_synced += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con autor {autor.get('nombreAutor', 'desconocido') if isinstance(autor, dict) else 'desconocido'}: {str(e)}")
                continue
        
        if autores_synced > 0:
            self.log(f"✅ {autores_synced} autores sincronizados")
        else:
            self.log("   ℹ️ No hay autores nuevos para sincronizar")
        
        # Luego sincronizar editoriales (solo las modificadas recientemente)
        self.log("\n🏢 Sincronizando editoriales...")
        local_editoriales = self.query_local("""
            SELECT * FROM core_editoriales 
            WHERE updated >= datetime('now', '-1 day') OR updated IS NULL
            ORDER BY updated DESC
        """)
        self.log(f"   📊 Editoriales modificadas recientemente: {len(local_editoriales) if local_editoriales else 0}")
        editoriales_synced = 0
        
        for idx, editorial_row in enumerate(local_editoriales, 1):
            try:
                # Convertir sqlite3.Row a dict
                editorial = dict(editorial_row)
                
                if idx % 100 == 0:
                    self.log(f"   🔄 Procesando editorial {idx}/{len(local_editoriales)}...")
                turso_editorial = self.query_turso("SELECT id FROM core_editoriales WHERE id = ?", [editorial['id']])
                if not turso_editorial:
                    created = editorial.get('created') or datetime.now().isoformat()
                    updated = editorial.get('updated') or datetime.now().isoformat()
                    sql = "INSERT INTO core_editoriales (id, descriEditorial, created, updated) VALUES (?, ?, ?, ?)"
                    result = self.query_turso(sql, [editorial['id'], editorial['descriEditorial'], created, updated])
                    if result is not None:
                        self.log(f"  ➕ Editorial creada: {editorial['descriEditorial']}")
                        editoriales_synced += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con editorial {editorial.get('descriEditorial', 'desconocida') if isinstance(editorial, dict) else 'desconocida'}: {str(e)}")
                continue
        
        if editoriales_synced > 0:
            self.log(f"✅ {editoriales_synced} editoriales sincronizadas")
        else:
            self.log("   ℹ️ No hay editoriales nuevas para sincronizar")
        
        # Finalmente sincronizar libros (solo los modificados recientemente)
        self.log("\n📚 Sincronizando libros...")
        # Obtener solo libros modificados en las últimas 24 horas o sin fecha de actualización
        local_books = self.query_local("""
            SELECT * FROM core_titulos 
            WHERE updated >= datetime('now', '-1 day') OR updated IS NULL
            ORDER BY updated DESC
        """)
        self.log(f"   📊 Libros modificados recientemente: {len(local_books) if local_books else 0}")
        
        if not local_books:
            self.log("No hay libros para sincronizar")
            return
        
        created_count = 0
        updated_count = 0
        skipped = 0
        
        for idx, book_row in enumerate(local_books, 1):
            try:
                # Convertir sqlite3.Row a dict
                book = dict(book_row)
                
                if idx % 50 == 0:
                    self.log(f"   🔄 Procesando libro {idx}/{len(local_books)}...")
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
            except Exception as e:
                self.log(f"  ⚠️ Error con libro {book.get('titulo', 'desconocido')}: {str(e)}")
                continue
        
        self.log(f"\n✅ Sincronización completada:")
        self.log(f"   ➕ {created_count} libros creados")
        self.log(f"   🔄 {updated_count} libros actualizados")
        self.log(f"   ⏭️  {skipped} libros sin cambios")
    
    def sync_turso_to_local(self):
        """Sincronizar de Turso a local"""
        self.log("📥 Sincronizando Turso → Local...")
        
        # Sincronizar usuarios
        self.log("\n👥 Sincronizando usuarios...")
        turso_usuarios = self.query_turso("SELECT * FROM auth_user")
        usuarios_synced = 0
        
        if turso_usuarios:
            for usuario in turso_usuarios:
                local_usuario = self.query_local("SELECT id FROM auth_user WHERE id = ?", (usuario['id'],))
                if not local_usuario:
                    # Insertar nuevo usuario
                    sql = """INSERT INTO auth_user (
                        id, password, last_login, is_superuser, username, first_name,
                        last_name, email, is_staff, is_active, date_joined
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
                    self.query_local(sql, (
                        usuario['id'], usuario['password'], usuario.get('last_login'),
                        usuario['is_superuser'], usuario['username'], usuario.get('first_name', ''),
                        usuario.get('last_name', ''), usuario.get('email', ''),
                        usuario['is_staff'], usuario['is_active'], usuario['date_joined']
                    ))
                    self.log(f"  ➕ Usuario creado: {usuario['username']}")
                    usuarios_synced += 1
                else:
                    # Actualizar usuario existente
                    sql = """UPDATE auth_user SET 
                        password = ?, last_login = ?, is_superuser = ?, first_name = ?,
                        last_name = ?, email = ?, is_staff = ?, is_active = ?
                        WHERE id = ?"""
                    self.query_local(sql, (
                        usuario['password'], usuario.get('last_login'), usuario['is_superuser'],
                        usuario.get('first_name', ''), usuario.get('last_name', ''),
                        usuario.get('email', ''), usuario['is_staff'], usuario['is_active'],
                        usuario['id']
                    ))
                    self.log(f"  🔄 Usuario actualizado: {usuario['username']}")
                    usuarios_synced += 1
        
        if usuarios_synced > 0:
            self.log(f"✅ {usuarios_synced} usuarios sincronizados")
        else:
            self.log("   ℹ️ No hay usuarios nuevos para sincronizar")
        
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
    
    def sync_full_bidirectional(self):
        """Sincronización completa bidireccional - Compara TODOS los registros"""
        self.log("🔄 SINCRONIZACIÓN COMPLETA BIDIRECCIONAL")
        self.log("⚠️  Este proceso puede tardar varios minutos...")
        self.log("="*60 + "\n")
        
        # ==================== AUTORES ====================
        self.log("\n👤 Sincronizando TODOS los autores...")
        self._sync_full_table(
            table_name='core_autores',
            id_field='id',
            display_field='nombreAutor',
            fields=['id', 'nombreAutor', 'enlaceWiki', 'enlaceWiki2', 'created', 'updated'],
            insert_sql="""INSERT INTO core_autores (id, nombreAutor, enlaceWiki, enlaceWiki2, created, updated) 
                          VALUES (?, ?, ?, ?, ?, ?)""",
            update_sql="""UPDATE core_autores SET nombreAutor = ?, enlaceWiki = ?, enlaceWiki2 = ?, updated = ? 
                          WHERE id = ?"""
        )
        
        # ==================== EDITORIALES ====================
        self.log("\n🏢 Sincronizando TODAS las editoriales...")
        self._sync_full_table(
            table_name='core_editoriales',
            id_field='id',
            display_field='descriEditorial',
            fields=['id', 'descriEditorial', 'created', 'updated'],
            insert_sql="""INSERT INTO core_editoriales (id, descriEditorial, created, updated) 
                          VALUES (?, ?, ?, ?)""",
            update_sql="""UPDATE core_editoriales SET descriEditorial = ?, updated = ? 
                          WHERE id = ?"""
        )
        
        # ==================== LIBROS ====================
        self.log("\n📚 Sincronizando TODOS los libros...")
        self._sync_full_books()
        
        self.log("\n" + "="*60)
        self.log("✅ SINCRONIZACIÓN COMPLETA FINALIZADA")
        self.log("="*60)
    
    def _sync_full_table(self, table_name, id_field, display_field, fields, insert_sql, update_sql):
        """Sincroniza una tabla completa comparando timestamps"""
        
        # Obtener todos los registros de ambas BDs
        local_records = self.query_local(f"SELECT * FROM {table_name}")
        turso_records = self.query_turso(f"SELECT * FROM {table_name}")
        
        self.log(f"   📊 Local: {len(local_records) if local_records else 0} registros")
        self.log(f"   📊 Turso: {len(turso_records) if turso_records else 0} registros")
        
        # Crear diccionarios por ID
        local_dict = {dict(r)[id_field]: dict(r) for r in local_records} if local_records else {}
        turso_dict = {r[id_field]: r for r in turso_records} if turso_records else {}
        
        created_local = 0
        created_turso = 0
        updated_local = 0
        updated_turso = 0
        
        # Procesar registros locales
        for record_id, local_rec in local_dict.items():
            try:
                if record_id not in turso_dict:
                    # No existe en Turso, crear
                    params = [local_rec.get(f) for f in fields]
                    if self.query_turso(insert_sql, params) is not None:
                        created_turso += 1
                        if created_turso % 100 == 0:
                            self.log(f"   🔄 Creados en Turso: {created_turso}...")
                else:
                    # Existe en ambos, comparar timestamps
                    turso_rec = turso_dict[record_id]
                    local_updated = local_rec.get('updated', '')
                    turso_updated = turso_rec.get('updated', '')
                    
                    if local_updated and turso_updated and local_updated > turso_updated:
                        # Local más reciente, actualizar Turso
                        # Excluir id (pos 0) y created (penúltima pos)
                        update_fields = [f for f in fields if f not in ['id', 'created']]
                        params = [local_rec.get(f) for f in update_fields]
                        params.append(record_id)
                        if self.query_turso(update_sql, params) is not None:
                            updated_turso += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con {local_rec.get(display_field, 'desconocido')}: {str(e)}")
                continue
        
        # Procesar registros de Turso que no están en local
        for record_id, turso_rec in turso_dict.items():
            try:
                if record_id not in local_dict:
                    # No existe en local, crear
                    params = tuple(turso_rec.get(f) for f in fields)
                    if self.query_local(insert_sql, params):
                        created_local += 1
                        if created_local % 100 == 0:
                            self.log(f"   🔄 Creados en Local: {created_local}...")
                else:
                    # Ya procesado en el bucle anterior
                    local_rec = local_dict[record_id]
                    local_updated = local_rec.get('updated', '')
                    turso_updated = turso_rec.get('updated', '')
                    
                    if turso_updated and local_updated and turso_updated > local_updated:
                        # Turso más reciente, actualizar local
                        # Excluir id y created
                        update_fields = [f for f in fields if f not in ['id', 'created']]
                        params = tuple(turso_rec.get(f) for f in update_fields)
                        params = params + (record_id,)
                        if self.query_local(update_sql, params):
                            updated_local += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con {turso_rec.get(display_field, 'desconocido')}: {str(e)}")
                continue
        
        # Resumen
        self.log(f"\n   ✅ Resultados:")
        self.log(f"      ➕ Creados en Local: {created_local}")
        self.log(f"      ➕ Creados en Turso: {created_turso}")
        self.log(f"      🔄 Actualizados en Local: {updated_local}")
        self.log(f"      🔄 Actualizados en Turso: {updated_turso}")
    
    def _sync_full_books(self):
        """Sincroniza todos los libros comparando timestamps"""
        
        # Obtener todos los libros de ambas BDs
        local_books = self.query_local("SELECT * FROM core_titulos")
        turso_books = self.query_turso("SELECT * FROM core_titulos")
        
        self.log(f"   📊 Local: {len(local_books) if local_books else 0} libros")
        self.log(f"   📊 Turso: {len(turso_books) if turso_books else 0} libros")
        
        # Crear diccionarios por ID
        local_dict = {dict(r)['id']: dict(r) for r in local_books} if local_books else {}
        turso_dict = {b['id']: b for b in turso_books} if turso_books else {}
        
        created_local = 0
        created_turso = 0
        updated_local = 0
        updated_turso = 0
        
        # Procesar libros locales
        for book_id, local_book in local_dict.items():
            try:
                if book_id not in turso_dict:
                    # No existe en Turso, crear
                    created = local_book.get('created') or datetime.now().isoformat()
                    updated = local_book.get('updated') or datetime.now().isoformat()
                    
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
                        local_book['id'], local_book.get('EAN'), local_book.get('titulo'),
                        local_book.get('numeroEdicion') or 1, local_book.get('anyoEdicion'),
                        local_book.get('numeroPaginas'), local_book.get('tituloOriginal'),
                        local_book.get('portada'), local_book.get('numeroEjemplares'),
                        created, updated,
                        local_book.get('codiAutor_id'), local_book.get('codiGenero_id'),
                        local_book.get('codiSoporte_id'), local_book.get('codiUbicacion_id'),
                        local_book.get('coleccion'), local_book.get('contraportada'),
                        local_book.get('codiEstante_id'), local_book.get('serie'),
                        local_book.get('codiEditorial_id'), local_book.get('sinopsis'),
                        local_book.get('observaciones'), local_book.get('portada_cloudinary')
                    ]
                    if self.query_turso(sql, params) is not None:
                        created_turso += 1
                        if created_turso % 50 == 0:
                            self.log(f"   🔄 Creados en Turso: {created_turso}...")
                else:
                    # Existe en ambos, comparar timestamps
                    turso_book = turso_dict[book_id]
                    local_updated = local_book.get('updated', '')
                    turso_updated = turso_book.get('updated', '')
                    
                    if local_updated and turso_updated and local_updated > turso_updated:
                        # Local más reciente, actualizar Turso
                        sql = """
                            UPDATE core_titulos SET
                                EAN = ?, titulo = ?, tituloOriginal = ?,
                                numeroEdicion = ?, anyoEdicion = ?, numeroPaginas = ?,
                                numeroEjemplares = ?, codiAutor_id = ?, codiEditorial_id = ?,
                                coleccion = ?, serie = ?, portada_cloudinary = ?,
                                sinopsis = ?, observaciones = ?, updated = ?
                            WHERE id = ?
                        """
                        params = [
                            local_book.get('EAN'), local_book.get('titulo'),
                            local_book.get('tituloOriginal'), local_book.get('numeroEdicion') or 1,
                            local_book.get('anyoEdicion'), local_book.get('numeroPaginas'),
                            local_book.get('numeroEjemplares'), local_book.get('codiAutor_id'),
                            local_book.get('codiEditorial_id'), local_book.get('coleccion'),
                            local_book.get('serie'), local_book.get('portada_cloudinary'),
                            local_book.get('sinopsis'), local_book.get('observaciones'),
                            local_book.get('updated'), book_id
                        ]
                        if self.query_turso(sql, params) is not None:
                            updated_turso += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con libro {local_book.get('titulo', 'desconocido')}: {str(e)}")
                continue
        
        # Procesar libros de Turso que no están en local
        for book_id, turso_book in turso_dict.items():
            try:
                if book_id not in local_dict:
                    # No existe en local, crear
                    created = turso_book.get('created') or datetime.now().isoformat()
                    updated = turso_book.get('updated') or datetime.now().isoformat()
                    
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
                        turso_book['id'], turso_book.get('EAN'), turso_book.get('titulo'),
                        turso_book.get('numeroEdicion') or 1, turso_book.get('anyoEdicion'),
                        turso_book.get('numeroPaginas'), turso_book.get('tituloOriginal'),
                        turso_book.get('portada'), turso_book.get('numeroEjemplares'),
                        created, updated,
                        turso_book.get('codiAutor_id'), turso_book.get('codiGenero_id'),
                        turso_book.get('codiSoporte_id'), turso_book.get('codiUbicacion_id'),
                        turso_book.get('coleccion'), turso_book.get('contraportada'),
                        turso_book.get('codiEstante_id'), turso_book.get('serie'),
                        turso_book.get('codiEditorial_id'), turso_book.get('sinopsis'),
                        turso_book.get('observaciones'), turso_book.get('portada_cloudinary')
                    )
                    if self.query_local(sql, params):
                        created_local += 1
                        if created_local % 50 == 0:
                            self.log(f"   🔄 Creados en Local: {created_local}...")
                else:
                    # Ya procesado en el bucle anterior
                    local_book = local_dict[book_id]
                    local_updated = local_book.get('updated', '')
                    turso_updated = turso_book.get('updated', '')
                    
                    if turso_updated and local_updated and turso_updated > local_updated:
                        # Turso más reciente, actualizar local
                        sql = """
                            UPDATE core_titulos SET
                                EAN = ?, titulo = ?, tituloOriginal = ?,
                                numeroEdicion = ?, anyoEdicion = ?, numeroPaginas = ?,
                                numeroEjemplares = ?, codiAutor_id = ?, codiEditorial_id = ?,
                                coleccion = ?, serie = ?, portada_cloudinary = ?,
                                sinopsis = ?, observaciones = ?, updated = ?
                            WHERE id = ?
                        """
                        params = (
                            turso_book.get('EAN'), turso_book.get('titulo'),
                            turso_book.get('tituloOriginal'), turso_book.get('numeroEdicion') or 1,
                            turso_book.get('anyoEdicion'), turso_book.get('numeroPaginas'),
                            turso_book.get('numeroEjemplares'), turso_book.get('codiAutor_id'),
                            turso_book.get('codiEditorial_id'), turso_book.get('coleccion'),
                            turso_book.get('serie'), turso_book.get('portada_cloudinary'),
                            turso_book.get('sinopsis'), turso_book.get('observaciones'),
                            turso_book.get('updated'), book_id
                        )
                        if self.query_local(sql, params):
                            updated_local += 1
            except Exception as e:
                self.log(f"  ⚠️ Error con libro {turso_book.get('titulo', 'desconocido')}: {str(e)}")
                continue
        
        # Resumen
        self.log(f"\n   ✅ Resultados:")
        self.log(f"      ➕ Creados en Local: {created_local}")
        self.log(f"      ➕ Creados en Turso: {created_turso}")
        self.log(f"      🔄 Actualizados en Local: {updated_local}")
        self.log(f"      🔄 Actualizados en Turso: {updated_turso}")
    
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
    
    # ==================== GESTIÓN DE AUTORES ====================
    
    def buscar_autores(self):
        """Buscar autores por nombre"""
        search_term = self.autor_search_var.get().strip()
        source = self.source_var.get()
        
        self.autores_tree.delete(*self.autores_tree.get_children())
        
        if search_term:
            sql = """
                SELECT a.id, a.nombreAutor, COUNT(t.id) as num_libros
                FROM core_autores a
                LEFT JOIN core_titulos t ON a.id = t.codiAutor_id
                WHERE a.nombreAutor LIKE ?
                GROUP BY a.id, a.nombreAutor
                ORDER BY a.nombreAutor
            """
            params = (f'%{search_term}%',)
        else:
            sql = """
                SELECT a.id, a.nombreAutor, COUNT(t.id) as num_libros
                FROM core_autores a
                LEFT JOIN core_titulos t ON a.id = t.codiAutor_id
                GROUP BY a.id, a.nombreAutor
                ORDER BY a.nombreAutor
            """
            params = ()
        
        if source == 'local':
            rows = self.query_local(sql, params)
        else:
            rows = self.query_turso(sql, list(params) if params else [])
        
        if rows:
            for row in rows:
                if not isinstance(row, dict):
                    row = dict(row)
                self.autores_tree.insert('', 'end', values=(
                    row['id'],
                    row['nombreAutor'],
                    row['num_libros']
                ))
            self.status_bar.config(text=f"Se encontraron {len(rows)} autores")
    
    def crear_nuevo_autor(self):
        """Crear nuevo autor"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Nuevo Autor")
        dialog.geometry("500x300")
        dialog.transient(self.root)
        dialog.grab_set()
        
        form_frame = ttk.Frame(dialog, padding=20)
        form_frame.pack(fill='both', expand=True)
        
        ttk.Label(form_frame, text="Nombre del Autor:*").grid(row=0, column=0, sticky='e', padx=5, pady=5)
        nombre_var = tk.StringVar()
        nombre_entry = ttk.Entry(form_frame, textvariable=nombre_var, width=40)
        nombre_entry.grid(row=0, column=1, padx=5, pady=5)
        nombre_entry.focus()
        
        ttk.Label(form_frame, text="Enlace Wiki 1:").grid(row=1, column=0, sticky='e', padx=5, pady=5)
        wiki1_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=wiki1_var, width=35).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(form_frame, text="🔗 Abrir", width=8,
                  command=lambda: webbrowser.open(wiki1_var.get()) if wiki1_var.get() else None).grid(row=1, column=2, padx=5, pady=5)
        
        ttk.Label(form_frame, text="Enlace Wiki 2:").grid(row=2, column=0, sticky='e', padx=5, pady=5)
        wiki2_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=wiki2_var, width=35).grid(row=2, column=1, padx=5, pady=5)
        ttk.Button(form_frame, text="🔗 Abrir", width=8,
                  command=lambda: webbrowser.open(wiki2_var.get()) if wiki2_var.get() else None).grid(row=2, column=2, padx=5, pady=5)
        
        def guardar():
            nombre = nombre_var.get().strip()
            if not nombre:
                messagebox.showwarning("Advertencia", "El nombre del autor es obligatorio")
                return
            
            wiki1 = wiki1_var.get().strip()
            wiki2 = wiki2_var.get().strip()
            
            source = self.source_var.get()
            sql = "INSERT INTO core_autores (nombreAutor, enlaceWiki, enlaceWiki2, created, updated) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
            
            if source == 'local':
                result = self.query_local(sql, (nombre, wiki1, wiki2))
            else:
                result = self.query_turso(sql, [nombre, wiki1, wiki2])
            
            if result:
                messagebox.showinfo("Éxito", f"Autor '{nombre}' creado correctamente")
                dialog.destroy()
                self.buscar_autores()
                self.cargar_autores()
            else:
                messagebox.showerror("Error", "No se pudo crear el autor")
        
        button_frame = ttk.Frame(form_frame)
        button_frame.grid(row=3, column=0, columnspan=2, pady=20)
        ttk.Button(button_frame, text="Guardar", command=guardar).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Cancelar", command=dialog.destroy).pack(side='left', padx=5)
    
    def editar_autor_seleccionado(self):
        """Editar autor seleccionado"""
        selection = self.autores_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un autor para editar")
            return
        
        item = self.autores_tree.item(selection[0])
        autor_id = item['values'][0]
        
        # Obtener datos completos del autor
        source = self.source_var.get()
        sql = "SELECT * FROM core_autores WHERE id = ?"
        if source == 'local':
            rows = self.query_local(sql, (autor_id,))
        else:
            rows = self.query_turso(sql, [autor_id])
        
        if not rows:
            messagebox.showerror("Error", "No se pudo cargar el autor")
            return
        
        autor = dict(rows[0]) if not isinstance(rows[0], dict) else rows[0]
        
        dialog = tk.Toplevel(self.root)
        dialog.title("Editar Autor")
        dialog.geometry("500x300")
        dialog.transient(self.root)
        dialog.grab_set()
        
        form_frame = ttk.Frame(dialog, padding=20)
        form_frame.pack(fill='both', expand=True)
        
        ttk.Label(form_frame, text="Nombre del Autor:*").grid(row=0, column=0, sticky='e', padx=5, pady=5)
        nombre_var = tk.StringVar(value=autor.get('nombreAutor', ''))
        nombre_entry = ttk.Entry(form_frame, textvariable=nombre_var, width=40)
        nombre_entry.grid(row=0, column=1, padx=5, pady=5)
        nombre_entry.focus()
        nombre_entry.select_range(0, tk.END)
        
        ttk.Label(form_frame, text="Enlace Wiki 1:").grid(row=1, column=0, sticky='e', padx=5, pady=5)
        wiki1_var = tk.StringVar(value=autor.get('enlaceWiki', ''))
        ttk.Entry(form_frame, textvariable=wiki1_var, width=35).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(form_frame, text="🔗 Abrir", width=8,
                  command=lambda: webbrowser.open(wiki1_var.get()) if wiki1_var.get() else None).grid(row=1, column=2, padx=5, pady=5)
        
        ttk.Label(form_frame, text="Enlace Wiki 2:").grid(row=2, column=0, sticky='e', padx=5, pady=5)
        wiki2_var = tk.StringVar(value=autor.get('enlaceWiki2', ''))
        ttk.Entry(form_frame, textvariable=wiki2_var, width=35).grid(row=2, column=1, padx=5, pady=5)
        ttk.Button(form_frame, text="🔗 Abrir", width=8,
                  command=lambda: webbrowser.open(wiki2_var.get()) if wiki2_var.get() else None).grid(row=2, column=2, padx=5, pady=5)
        
        def guardar():
            nombre = nombre_var.get().strip()
            if not nombre:
                messagebox.showwarning("Advertencia", "El nombre del autor es obligatorio")
                return
            
            wiki1 = wiki1_var.get().strip()
            wiki2 = wiki2_var.get().strip()
            
            source = self.source_var.get()
            sql = "UPDATE core_autores SET nombreAutor = ?, enlaceWiki = ?, enlaceWiki2 = ?, updated = datetime('now') WHERE id = ?"
            
            if source == 'local':
                result = self.query_local(sql, (nombre, wiki1, wiki2, autor_id))
            else:
                result = self.query_turso(sql, [nombre, wiki1, wiki2, autor_id])
            
            if result:
                messagebox.showinfo("Éxito", f"Autor actualizado correctamente")
                dialog.destroy()
                self.buscar_autores()
                self.cargar_autores()
            else:
                messagebox.showerror("Error", "No se pudo actualizar el autor")
        
        button_frame = ttk.Frame(form_frame)
        button_frame.grid(row=3, column=0, columnspan=2, pady=20)
        ttk.Button(button_frame, text="Guardar", command=guardar).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Cancelar", command=dialog.destroy).pack(side='left', padx=5)
    
    def eliminar_autor(self):
        """Eliminar autor seleccionado"""
        selection = self.autores_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un autor para eliminar")
            return
        
        item = self.autores_tree.item(selection[0])
        autor_id = item['values'][0]
        nombre = item['values'][1]
        num_libros = item['values'][2]
        
        if num_libros > 0:
            messagebox.showwarning("Advertencia", 
                f"No se puede eliminar el autor '{nombre}' porque tiene {num_libros} libro(s) asociado(s)")
            return
        
        if not messagebox.askyesno("Confirmar", f"¿Estás seguro de eliminar el autor '{nombre}'?"):
            return
        
        source = self.source_var.get()
        sql = "DELETE FROM core_autores WHERE id = ?"
        
        if source == 'local':
            result = self.query_local(sql, (autor_id,))
        else:
            result = self.query_turso(sql, [autor_id])
        
        if result:
            messagebox.showinfo("Éxito", "Autor eliminado correctamente")
            self.buscar_autores()
            self.cargar_autores()
        else:
            messagebox.showerror("Error", "No se pudo eliminar el autor")
    
    # ==================== GESTIÓN DE EDITORIALES ====================
    
    def buscar_editoriales(self):
        """Buscar editoriales por nombre"""
        search_term = self.editorial_search_var.get().strip()
        source = self.source_var.get()
        
        self.editoriales_tree.delete(*self.editoriales_tree.get_children())
        
        if search_term:
            sql = """
                SELECT e.id, e.descriEditorial, COUNT(t.id) as num_libros
                FROM core_editoriales e
                LEFT JOIN core_titulos t ON e.id = t.codiEditorial_id
                WHERE e.descriEditorial LIKE ?
                GROUP BY e.id, e.descriEditorial
                ORDER BY e.descriEditorial
            """
            params = (f'%{search_term}%',)
        else:
            sql = """
                SELECT e.id, e.descriEditorial, COUNT(t.id) as num_libros
                FROM core_editoriales e
                LEFT JOIN core_titulos t ON e.id = t.codiEditorial_id
                GROUP BY e.id, e.descriEditorial
                ORDER BY e.descriEditorial
            """
            params = ()
        
        if source == 'local':
            rows = self.query_local(sql, params)
        else:
            rows = self.query_turso(sql, list(params) if params else [])
        
        if rows:
            for row in rows:
                if not isinstance(row, dict):
                    row = dict(row)
                self.editoriales_tree.insert('', 'end', values=(
                    row['id'],
                    row['descriEditorial'],
                    row['num_libros']
                ))
            self.status_bar.config(text=f"Se encontraron {len(rows)} editoriales")
    
    def crear_nueva_editorial(self):
        """Crear nueva editorial"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Nueva Editorial")
        dialog.geometry("400x150")
        dialog.transient(self.root)
        dialog.grab_set()
        
        ttk.Label(dialog, text="Nombre de la Editorial:").pack(pady=10)
        nombre_var = tk.StringVar()
        nombre_entry = ttk.Entry(dialog, textvariable=nombre_var, width=40)
        nombre_entry.pack(pady=5)
        nombre_entry.focus()
        
        def guardar():
            nombre = nombre_var.get().strip()
            if not nombre:
                messagebox.showwarning("Advertencia", "El nombre de la editorial es obligatorio")
                return
            
            source = self.source_var.get()
            sql = "INSERT INTO core_editoriales (descriEditorial, created, updated) VALUES (?, datetime('now'), datetime('now'))"
            
            if source == 'local':
                result = self.query_local(sql, (nombre,))
            else:
                result = self.query_turso(sql, [nombre])
            
            if result:
                messagebox.showinfo("Éxito", f"Editorial '{nombre}' creada correctamente")
                dialog.destroy()
                self.buscar_editoriales()
                self.cargar_editoriales()
            else:
                messagebox.showerror("Error", "No se pudo crear la editorial")
        
        button_frame = ttk.Frame(dialog)
        button_frame.pack(pady=20)
        ttk.Button(button_frame, text="Guardar", command=guardar).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Cancelar", command=dialog.destroy).pack(side='left', padx=5)
    
    def editar_editorial_seleccionada(self):
        """Editar editorial seleccionada"""
        selection = self.editoriales_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona una editorial para editar")
            return
        
        item = self.editoriales_tree.item(selection[0])
        editorial_id = item['values'][0]
        nombre_actual = item['values'][1]
        
        dialog = tk.Toplevel(self.root)
        dialog.title("Editar Editorial")
        dialog.geometry("400x150")
        dialog.transient(self.root)
        dialog.grab_set()
        
        ttk.Label(dialog, text="Nombre de la Editorial:").pack(pady=10)
        nombre_var = tk.StringVar(value=nombre_actual)
        nombre_entry = ttk.Entry(dialog, textvariable=nombre_var, width=40)
        nombre_entry.pack(pady=5)
        nombre_entry.focus()
        nombre_entry.select_range(0, tk.END)
        
        def guardar():
            nombre = nombre_var.get().strip()
            if not nombre:
                messagebox.showwarning("Advertencia", "El nombre de la editorial es obligatorio")
                return
            
            source = self.source_var.get()
            sql = "UPDATE core_editoriales SET descriEditorial = ?, updated = datetime('now') WHERE id = ?"
            
            if source == 'local':
                result = self.query_local(sql, (nombre, editorial_id))
            else:
                result = self.query_turso(sql, [nombre, editorial_id])
            
            if result:
                messagebox.showinfo("Éxito", f"Editorial actualizada correctamente")
                dialog.destroy()
                self.buscar_editoriales()
                self.cargar_editoriales()
            else:
                messagebox.showerror("Error", "No se pudo actualizar la editorial")
        
        button_frame = ttk.Frame(dialog)
        button_frame.pack(pady=20)
        ttk.Button(button_frame, text="Guardar", command=guardar).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Cancelar", command=dialog.destroy).pack(side='left', padx=5)
    
    def eliminar_editorial(self):
        """Eliminar editorial seleccionada"""
        selection = self.editoriales_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona una editorial para eliminar")
            return
        
        item = self.editoriales_tree.item(selection[0])
        editorial_id = item['values'][0]
        nombre = item['values'][1]
        num_libros = item['values'][2]
        
        if num_libros > 0:
            messagebox.showwarning("Advertencia", 
                f"No se puede eliminar la editorial '{nombre}' porque tiene {num_libros} libro(s) asociado(s)")
            return
        
        if not messagebox.askyesno("Confirmar", f"¿Estás seguro de eliminar la editorial '{nombre}'?"):
            return
        
        source = self.source_var.get()
        sql = "DELETE FROM core_editoriales WHERE id = ?"
        
        if source == 'local':
            result = self.query_local(sql, (editorial_id,))
        else:
            result = self.query_turso(sql, [editorial_id])
        
        if result:
            messagebox.showinfo("Éxito", "Editorial eliminada correctamente")
            self.buscar_editoriales()
            self.cargar_editoriales()
        else:
            messagebox.showerror("Error", "No se pudo eliminar la editorial")
    
    # ==================== GESTIÓN DE USUARIOS ====================
    
    def create_usuarios_tab(self):
        """Pestaña de gestión de usuarios"""
        
        # Frame superior: Búsqueda
        search_frame = ttk.LabelFrame(self.tab_usuarios, text="Búsqueda de Usuarios", padding=10)
        search_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Label(search_frame, text="Buscar:").grid(row=0, column=0, padx=5)
        self.usuario_search_var = tk.StringVar()
        self.usuario_search_var.trace('w', lambda *args: self.buscar_usuarios())
        ttk.Entry(search_frame, textvariable=self.usuario_search_var, width=40).grid(row=0, column=1, padx=5)
        
        ttk.Button(search_frame, text="🔄 Recargar", command=self.buscar_usuarios).grid(row=0, column=2, padx=5)
        ttk.Button(search_frame, text="➕ Nuevo Usuario", command=self.crear_nuevo_usuario).grid(row=0, column=3, padx=5)
        
        # Frame medio: Lista de usuarios
        list_frame = ttk.LabelFrame(self.tab_usuarios, text="Usuarios", padding=10)
        list_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Treeview
        columns = ('ID', 'Username', 'Email', 'Superuser', 'Staff', 'Active', 'Last Login')
        self.usuarios_tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=15)
        
        self.usuarios_tree.heading('ID', text='ID')
        self.usuarios_tree.heading('Username', text='Usuario')
        self.usuarios_tree.heading('Email', text='Email')
        self.usuarios_tree.heading('Superuser', text='Admin')
        self.usuarios_tree.heading('Staff', text='Staff')
        self.usuarios_tree.heading('Active', text='Activo')
        self.usuarios_tree.heading('Last Login', text='Último Login')
        
        self.usuarios_tree.column('ID', width=50)
        self.usuarios_tree.column('Username', width=150)
        self.usuarios_tree.column('Email', width=200)
        self.usuarios_tree.column('Superuser', width=80)
        self.usuarios_tree.column('Staff', width=80)
        self.usuarios_tree.column('Active', width=80)
        self.usuarios_tree.column('Last Login', width=150)
        
        scrollbar = ttk.Scrollbar(list_frame, orient='vertical', command=self.usuarios_tree.yview)
        self.usuarios_tree.configure(yscrollcommand=scrollbar.set)
        
        self.usuarios_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Frame inferior: Acciones
        actions_frame = ttk.Frame(self.tab_usuarios)
        actions_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(actions_frame, text="✏️ Editar", command=self.editar_usuario_seleccionado).pack(side='left', padx=5)
        ttk.Button(actions_frame, text="🗑️ Eliminar", command=self.eliminar_usuario).pack(side='left', padx=5)
        
        # Cargar usuarios al abrir la pestaña
        self.root.after(100, self.buscar_usuarios)
    
    def buscar_usuarios(self):
        """Buscar usuarios por username o email"""
        search_term = self.usuario_search_var.get().strip()
        source = self.source_var.get()
        
        self.usuarios_tree.delete(*self.usuarios_tree.get_children())
        
        if search_term:
            sql = """
                SELECT id, username, email, is_superuser, is_staff, is_active, last_login
                FROM auth_user
                WHERE username LIKE ? OR email LIKE ?
                ORDER BY username
            """
            params = (f'%{search_term}%', f'%{search_term}%')
        else:
            sql = """
                SELECT id, username, email, is_superuser, is_staff, is_active, last_login
                FROM auth_user
                ORDER BY username
            """
            params = ()
        
        if source == 'local':
            rows = self.query_local(sql, params)
        else:
            rows = self.query_turso(sql, list(params) if params else [])
        
        if rows:
            for row in rows:
                if not isinstance(row, dict):
                    row = dict(row)
                self.usuarios_tree.insert('', 'end', values=(
                    row['id'],
                    row['username'],
                    row['email'] or '',
                    '✓' if row['is_superuser'] else '',
                    '✓' if row['is_staff'] else '',
                    '✓' if row['is_active'] else '',
                    row['last_login'] or 'Nunca'
                ))
            self.status_bar.config(text=f"Se encontraron {len(rows)} usuarios")
    
    def crear_nuevo_usuario(self):
        """Crear nuevo usuario (solo muestra información, la creación real debe hacerse con Django)"""
        messagebox.showinfo("Información", 
            "Para crear usuarios con contraseñas seguras, debes usar:\n\n"
            "1. Django Admin (python manage.py createsuperuser)\n"
            "2. Django Shell (User.objects.create_user())\n\n"
            "Los usuarios creados se sincronizarán automáticamente con Turso.")
    
    def editar_usuario_seleccionado(self):
        """Editar usuario seleccionado"""
        selection = self.usuarios_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un usuario para editar")
            return
        
        item = self.usuarios_tree.item(selection[0])
        usuario_id = item['values'][0]
        
        # Obtener datos completos del usuario
        source = self.source_var.get()
        sql = "SELECT * FROM auth_user WHERE id = ?"
        if source == 'local':
            rows = self.query_local(sql, (usuario_id,))
        else:
            rows = self.query_turso(sql, [usuario_id])
        
        if not rows:
            messagebox.showerror("Error", "No se pudo cargar el usuario")
            return
        
        usuario = dict(rows[0]) if not isinstance(rows[0], dict) else rows[0]
        
        dialog = tk.Toplevel(self.root)
        dialog.title("Editar Usuario")
        dialog.geometry("500x400")
        dialog.transient(self.root)
        dialog.grab_set()
        
        form_frame = ttk.Frame(dialog, padding=20)
        form_frame.pack(fill='both', expand=True)
        
        # Username (solo lectura)
        ttk.Label(form_frame, text="Username:").grid(row=0, column=0, sticky='e', padx=5, pady=5)
        username_label = ttk.Label(form_frame, text=usuario.get('username', ''), font=('Arial', 10, 'bold'))
        username_label.grid(row=0, column=1, sticky='w', padx=5, pady=5)
        
        # Email
        ttk.Label(form_frame, text="Email:").grid(row=1, column=0, sticky='e', padx=5, pady=5)
        email_var = tk.StringVar(value=usuario.get('email', ''))
        ttk.Entry(form_frame, textvariable=email_var, width=40).grid(row=1, column=1, padx=5, pady=5)
        
        # First Name
        ttk.Label(form_frame, text="Nombre:").grid(row=2, column=0, sticky='e', padx=5, pady=5)
        first_name_var = tk.StringVar(value=usuario.get('first_name', ''))
        ttk.Entry(form_frame, textvariable=first_name_var, width=40).grid(row=2, column=1, padx=5, pady=5)
        
        # Last Name
        ttk.Label(form_frame, text="Apellidos:").grid(row=3, column=0, sticky='e', padx=5, pady=5)
        last_name_var = tk.StringVar(value=usuario.get('last_name', ''))
        ttk.Entry(form_frame, textvariable=last_name_var, width=40).grid(row=3, column=1, padx=5, pady=5)
        
        # Checkboxes
        ttk.Label(form_frame, text="Permisos:").grid(row=4, column=0, sticky='e', padx=5, pady=5)
        permisos_frame = ttk.Frame(form_frame)
        permisos_frame.grid(row=4, column=1, sticky='w', padx=5, pady=5)
        
        is_superuser_var = tk.BooleanVar(value=bool(usuario.get('is_superuser', 0)))
        is_staff_var = tk.BooleanVar(value=bool(usuario.get('is_staff', 0)))
        is_active_var = tk.BooleanVar(value=bool(usuario.get('is_active', 1)))
        
        ttk.Checkbutton(permisos_frame, text="Superusuario", variable=is_superuser_var).pack(anchor='w')
        ttk.Checkbutton(permisos_frame, text="Staff", variable=is_staff_var).pack(anchor='w')
        ttk.Checkbutton(permisos_frame, text="Activo", variable=is_active_var).pack(anchor='w')
        
        # Nota sobre contraseña
        ttk.Label(form_frame, text="Nota:", font=('Arial', 9, 'bold')).grid(row=5, column=0, sticky='ne', padx=5, pady=10)
        nota_text = "Para cambiar la contraseña, usa Django Admin\no Django Shell (user.set_password())"
        ttk.Label(form_frame, text=nota_text, foreground='gray').grid(row=5, column=1, sticky='w', padx=5, pady=10)
        
        def guardar():
            email = email_var.get().strip()
            first_name = first_name_var.get().strip()
            last_name = last_name_var.get().strip()
            
            source = self.source_var.get()
            sql = """UPDATE auth_user SET 
                     email = ?, first_name = ?, last_name = ?,
                     is_superuser = ?, is_staff = ?, is_active = ?
                     WHERE id = ?"""
            
            params = [email, first_name, last_name, 
                     int(is_superuser_var.get()), int(is_staff_var.get()), int(is_active_var.get()),
                     usuario_id]
            
            if source == 'local':
                result = self.query_local(sql, tuple(params))
            else:
                result = self.query_turso(sql, params)
            
            if result:
                messagebox.showinfo("Éxito", "Usuario actualizado correctamente")
                dialog.destroy()
                self.buscar_usuarios()
            else:
                messagebox.showerror("Error", "No se pudo actualizar el usuario")
        
        button_frame = ttk.Frame(form_frame)
        button_frame.grid(row=6, column=0, columnspan=2, pady=20)
        ttk.Button(button_frame, text="Guardar", command=guardar).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Cancelar", command=dialog.destroy).pack(side='left', padx=5)
    
    def eliminar_usuario(self):
        """Eliminar usuario seleccionado"""
        selection = self.usuarios_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un usuario para eliminar")
            return
        
        item = self.usuarios_tree.item(selection[0])
        usuario_id = item['values'][0]
        username = item['values'][1]
        
        if not messagebox.askyesno("Confirmar", 
            f"¿Estás seguro de eliminar el usuario '{username}'?\n\n"
            "ADVERTENCIA: Esta acción no se puede deshacer."):
            return
        
        source = self.source_var.get()
        sql = "DELETE FROM auth_user WHERE id = ?"
        
        if source == 'local':
            result = self.query_local(sql, (usuario_id,))
        else:
            result = self.query_turso(sql, [usuario_id])
        
        if result:
            messagebox.showinfo("Éxito", "Usuario eliminado correctamente")
            self.buscar_usuarios()
        else:
            messagebox.showerror("Error", "No se pudo eliminar el usuario")

# ==================== MAIN ====================

if __name__ == "__main__":
    root = tk.Tk()
    app = CatalogoManager(root)
    root.mainloop()
