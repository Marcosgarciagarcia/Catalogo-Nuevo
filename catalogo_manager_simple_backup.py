"""
Catálogo Manager - Versión Simple y Rápida
Interfaz moderna con CustomTkinter - Lista simple sin imágenes en grid
"""

# -*- coding: utf-8-
import customtkinter as ctk
from tkinter import messagebox
import sqlite3
import requests
import json
from datetime import datetime
from PIL import Image
import io
import sys

# Forzar UTF-8 en la salida
if sys.version_info[0] >= 3:
    import locale
    try:
        locale.setlocale(locale.LC_ALL, 'es_ES.UTF-8')
    except:
    def __init__(self):
        super().__init__()
        
        self.title("­ƒôÜ Cat├ílogo Manager - Modern UI")
        
        # Maximizar ventana al iniciar (mantiene controles de ventana)
        self.after(100, lambda: self.state('zoomed'))
        
        self.local_db = r'C:\ProyectosDjango\casateca\db.sqlite3'
        self.turso_url = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
        self.turso_token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'
        
        self.current_libro = None
        self.autores_cache = {}
        self.editoriales_cache = {}
        self.current_page = 0
        self.items_per_page = 50
        self.total_books = 0
        
        self.create_widgets()
        self.load_initial_data()
    
    def create_widgets(self):
        # Sidebar
        self.sidebar = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)
        
        ctk.CTkLabel(self.sidebar, text="­ƒôÜ Cat├ílogo", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=20)
        
        # Botones de navegaci├│n
        self.nav_buttons = {}
        nav_items = [
            ("📚 Catálogo", self.show_catalogo),
            ("👥 Usuarios", self.show_usuarios),
            ("🔄 Sincronización", self.show_sincronizacion),
            ("📊 Estadísticas", self.show_estadisticas),
            ("👤 Autores", self.show_autores),
            ("🏢 Editoriales", self.show_editoriales),
        ]
        
        for text, command in nav_items:
            btn = ctk.CTkButton(self.sidebar, text=text, command=command, height=40, fg_color="transparent", anchor="w")
            btn.pack(fill="x", padx=10, pady=5)
            self.nav_buttons[text] = btn
        
        # Theme switch
        ctk.CTkLabel(self.sidebar, text="Tema:", font=ctk.CTkFont(size=12)).pack(pady=(20, 5))
        self.theme_switch = ctk.CTkSegmentedButton(self.sidebar, values=["light", "dark"], command=self.toggle_theme)
        self.theme_switch.set("dark")
        self.theme_switch.pack(padx=10)
        
        # Main frame
        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.pack(side="right", fill="both", expand=True, padx=10, pady=10)
        
        self.show_catalogo()
    
    def toggle_theme(self, value):
        ctk.set_appearance_mode(value)
    
    def highlight_nav_button(self, button_text):
        for text, btn in self.nav_buttons.items():
            if text == button_text:
                btn.configure(fg_color=("#3b82f6", "#1e40af"))  # Azul claro/oscuro
            else:
                btn.configure(fg_color="transparent")
    
    def clear_main_frame(self):
        """Limpia el frame principal de forma segura"""
        try:
            for widget in self.main_frame.winfo_children():
                widget.destroy()
        except Exception as e:
            print(f"Error limpiando frame: {e}")
    
    def show_catalogo(self):
        self.clear_main_frame()
        self.highlight_nav_button("­ƒôÜ Cat├ílogo")
        
        # Header reorganizado: BD | T├¡tulo | B├║squeda
        header = ctk.CTkFrame(self.main_frame)
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        # IZQUIERDA: Selector de BD
        source_frame = ctk.CTkFrame(header, fg_color="transparent")
        source_frame.pack(side="left", padx=5)
        
        ctk.CTkLabel(source_frame, text="BD:", font=ctk.CTkFont(size=12, weight="bold")).pack(side="left", padx=(0, 5))
        
        self.source_var = ctk.StringVar(value="local")
        source_selector = ctk.CTkSegmentedButton(
            source_frame, 
            values=["Local", "Turso"], 
            variable=self.source_var, 
            command=self.on_source_change,
            selected_color=("#2ecc71", "#27ae60"),
            selected_hover_color=("#27ae60", "#229954"),
            font=ctk.CTkFont(size=12, weight="bold")
        )
        source_selector.pack(side="left", padx=5)
        
        self.db_indicator = ctk.CTkLabel(
            source_frame,
            text="ÔùÅ LOCAL",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=("#2ecc71", "#27ae60")
        )
        self.db_indicator.pack(side="left", padx=(5, 0))
        
        # CENTRO: Título con botón Crear
        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.pack(side="left", expand=True, padx=20)
        
        ctk.CTkLabel(title_frame, text="Catálogo de Libros", font=ctk.CTkFont(size=28, weight="bold")).pack(side="left")
        ctk.CTkButton(title_frame, text="➕ Crear Libro", command=self.crear_libro, width=120).pack(side="right", padx=(20, 0))
        
        # DERECHA: B├║squeda con filtros
        search_frame = ctk.CTkFrame(header, fg_color="transparent")
        search_frame.pack(side="right", padx=5)
        
        # Filtro de b├║squeda
        self.search_filter_var = ctk.StringVar(value="titulo")
        filter_menu = ctk.CTkSegmentedButton(
            search_frame,
            values=["T├¡tulo", "Autor", "EAN"],
            variable=self.search_filter_var,
            width=200
        )
        filter_menu.pack(side="left", padx=(0, 5))
        
        self.search_entry = ctk.CTkEntry(search_frame, placeholder_text="Buscar...", width=250)
        self.search_entry.pack(side="left", padx=5)
        self.search_entry.bind("<Return>", lambda e: self.buscar_libros())
        
        ctk.CTkButton(search_frame, text="­ƒöì", command=self.buscar_libros, width=40).pack(side="left", padx=2)
        ctk.CTkButton(search_frame, text="Ô£û Limpiar", command=self.limpiar_filtros, width=80).pack(side="left", padx=2)
        
        # Lista simple de libros
        list_frame = ctk.CTkFrame(self.main_frame)
        list_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.books_scroll = ctk.CTkScrollableFrame(list_frame, label_text="Libros Disponibles", label_font=ctk.CTkFont(size=16, weight="bold"))
        self.books_scroll.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Paginaci├│n al pie con primera/├║ltima
        pagination_frame = ctk.CTkFrame(self.main_frame)
        pagination_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        # Botones de navegaci├│n izquierda
        nav_left = ctk.CTkFrame(pagination_frame, fg_color="transparent")
        nav_left.pack(side="left", padx=5)
        
        self.first_btn = ctk.CTkButton(nav_left, text="ÔÅ« Primera", command=self.first_page, width=90, height=32)
        self.first_btn.pack(side="left", padx=2)
        
        self.prev_btn = ctk.CTkButton(nav_left, text="ÔùÇ Anterior", command=self.prev_page, width=90, height=32)
        self.prev_btn.pack(side="left", padx=2)
        
        # Frame para n├║meros de p├ígina (centro)
        self.pages_frame = ctk.CTkFrame(pagination_frame, fg_color="transparent")
        self.pages_frame.pack(side="left", padx=10)
        
        # Botones de navegaci├│n derecha
        nav_right = ctk.CTkFrame(pagination_frame, fg_color="transparent")
        nav_right.pack(side="left", padx=5)
        
        self.next_btn = ctk.CTkButton(nav_right, text="Siguiente ÔûÂ", command=self.next_page, width=90, height=32)
        self.next_btn.pack(side="left", padx=2)
        
        self.last_btn = ctk.CTkButton(nav_right, text="├Ültima ÔÅ¡", command=self.last_page, width=90, height=32)
        self.last_btn.pack(side="left", padx=2)
        
        # Ir a p├ígina espec├¡fica (derecha)
        goto_frame = ctk.CTkFrame(pagination_frame, fg_color="transparent")
        goto_frame.pack(side="right", padx=10)
        
        self.page_label = ctk.CTkLabel(goto_frame, text="P├ígina 1", font=ctk.CTkFont(size=12, weight="bold"))
        self.page_label.pack(side="left", padx=10)
        
        ctk.CTkLabel(goto_frame, text="Ir a:", font=ctk.CTkFont(size=11)).pack(side="left", padx=(10, 5))
        
        self.page_entry = ctk.CTkEntry(goto_frame, width=50, height=32)
        self.page_entry.pack(side="left", padx=2)
        self.page_entry.bind("<Return>", lambda e: self.goto_page())
        
        ctk.CTkButton(goto_frame, text="ÔåÆ", command=self.goto_page, width=35, height=32).pack(side="left", padx=2)
        
        self.current_page = 0
        self.cargar_libros()
    
    def on_source_change(self, value):
        self.source_var.set(value.lower())
        self.current_page = 0
        
        # Actualizar indicador visual
        if hasattr(self, 'db_indicator'):
            if value.lower() == "local":
                self.db_indicator.configure(
                    text="ÔùÅ LOCAL",
                    text_color=("#2ecc71", "#27ae60")
                )
            else:
                self.db_indicator.configure(
                    text="ÔùÅ TURSO",
                    text_color=("#3498db", "#2980b9")
                )
        
        self.cargar_libros()
    
    def cargar_libros(self):
        if not hasattr(self, 'books_scroll'):
            return
        
        for widget in self.books_scroll.winfo_children():
            widget.destroy()
        
        try:
            source = self.source_var.get().lower()
            offset = self.current_page * self.items_per_page
            
            if source == "local":
                count_result = self.query_local("SELECT COUNT(*) FROM core_titulos")
                self.total_books = count_result[0][0] if count_result else 0
                
                books = self.query_local(f"""
                    SELECT t.id, t.EAN, t.titulo, a.nombreAutor, e.descriEditorial, 
                           t.anyoEdicion, t.portada_cloudinary, t.sinopsis
                    FROM core_titulos t
                    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
                    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
                    ORDER BY t.titulo
                    LIMIT {self.items_per_page} OFFSET {offset}
                """)
            else:
                count_result = self.query_turso("SELECT COUNT(*) FROM core_titulos")
                self.total_books = count_result[0][0] if count_result else 0
                
                books = self.query_turso(f"""
                    SELECT t.id, t.EAN, t.titulo, a.nombreAutor, e.descriEditorial, 
                           t.anyoEdicion, t.portada_cloudinary, t.sinopsis
                    FROM core_titulos t
                    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
                    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
                    ORDER BY t.titulo
                    LIMIT {self.items_per_page} OFFSET {offset}
                """)
            
            if books:
                for book in books:
                    self.create_book_row(book)
            else:
                ctk.CTkLabel(self.books_scroll, text="No se encontraron libros", font=ctk.CTkFont(size=14)).pack(pady=20)
            
            self.update_pagination_controls()
        except Exception as e:
            ctk.CTkLabel(self.books_scroll, text=f"Error: {str(e)}", font=ctk.CTkFont(size=14)).pack(pady=20)
    
    def create_book_row(self, book):
        """Crear fila simple de libro (sin imágenes) con botones de acción"""
        card = ctk.CTkFrame(self.books_scroll)
        card.pack(fill="x", padx=10, pady=5)
        
        # Información del libro
        info_frame = ctk.CTkFrame(card, fg_color="transparent")
        info_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        
        title_text = f"📖 {book[2] if len(book) > 2 else 'Sin título'}"
        ctk.CTkLabel(info_frame, text=title_text, font=ctk.CTkFont(size=16, weight="bold"), anchor="w").pack(anchor="w")
        
        details_text = f"Autor: {book[3] if len(book) > 3 and book[3] else 'Desconocido'} | "
        details_text += f"Editorial: {book[4] if len(book) > 4 and book[4] else 'Desconocida'} | "
        details_text += f"Año: {book[5] if len(book) > 5 and book[5] else 'N/A'}"
        
        ctk.CTkLabel(info_frame, text=details_text, font=ctk.CTkFont(size=12), anchor="w", text_color="gray").pack(anchor="w")
        
        # Botones de acción
        buttons_frame = ctk.CTkFrame(card, fg_color="transparent")
        buttons_frame.pack(side="right", padx=10, pady=10)
        
        ctk.CTkButton(buttons_frame, text="👁️ Ver", width=80, height=30, command=lambda b=book: self.show_book_detail(b)).pack(side="right", padx=2)
        ctk.CTkButton(buttons_frame, text="✏️ Editar", width=80, height=30, command=lambda b=book: self.editar_libro(b)).pack(side="right", padx=2)
        ctk.CTkButton(buttons_frame, text="🗑️ Eliminar", width=80, height=30, command=lambda b=book: self.eliminar_libro(b)).pack(side="right", padx=2)
    
    def show_book_detail(self, book):
        """Mostrar modal con detalles del libro"""
        modal = ctk.CTkToplevel(self)
        modal.title("Detalles del Libro")
        modal.geometry("800x600")
        modal.transient(self)
        modal.grab_set()
        
        # Header con t├¡tulo
        header = ctk.CTkFrame(modal)
        header.pack(fill="x", padx=20, pady=20)
        ctk.CTkLabel(header, text=book[2] if len(book) > 2 else "Sin t├¡tulo", font=ctk.CTkFont(size=24, weight="bold"), wraplength=700).pack()
        
        # Contenido scrollable
        content = ctk.CTkScrollableFrame(modal)
        content.pack(fill="both", expand=True, padx=20, pady=(0, 10))
        
        # 1. ID (primero)
        id_frame = ctk.CTkFrame(content, fg_color="transparent")
        id_frame.pack(fill="x", pady=5)
        ctk.CTkLabel(id_frame, text="ID:", font=ctk.CTkFont(size=14, weight="bold"), width=120, anchor="w").pack(side="left", padx=10)
        ctk.CTkLabel(id_frame, text=str(book[0] if len(book) > 0 else "N/A"), font=ctk.CTkFont(size=14), anchor="w").pack(side="left", padx=10)
        
        # 2. Portada (segundo)
        if len(book) > 6 and book[6]:
            try:
                response = requests.get(book[6], timeout=3)
                if response.status_code == 200:
                    img_data = Image.open(io.BytesIO(response.content))
                    img_data = img_data.resize((300, 400), Image.Resampling.LANCZOS)
                    photo = ctk.CTkImage(light_image=img_data, dark_image=img_data, size=(300, 400))
                    img_label = ctk.CTkLabel(content, image=photo, text="")
                    img_label.image = photo
                    img_label.pack(pady=10)
            except:
                pass
        
        # 3. Resto de informaci├│n
        info_data = [
            ("EAN:", book[1] if len(book) > 1 and book[1] else "N/A"),
            ("Autor:", book[3] if len(book) > 3 and book[3] else "Desconocido"),
            ("Editorial:", book[4] if len(book) > 4 and book[4] else "Desconocida"),
            ("A├▒o:", book[5] if len(book) > 5 and book[5] else "N/A"),
        ]
        
        for label, value in info_data:
            row = ctk.CTkFrame(content, fg_color="transparent")
            row.pack(fill="x", pady=5)
            ctk.CTkLabel(row, text=label, font=ctk.CTkFont(size=14, weight="bold"), width=120, anchor="w").pack(side="left", padx=10)
            ctk.CTkLabel(row, text=str(value), font=ctk.CTkFont(size=14), anchor="w").pack(side="left", padx=10, fill="x", expand=True)
        
        # 4. Sinopsis (con scroll)
        if len(book) > 7 and book[7]:
            ctk.CTkLabel(content, text="Sinopsis:", font=ctk.CTkFont(size=14, weight="bold"), anchor="w").pack(fill="x", padx=10, pady=(15, 5))
            synopsis_box = ctk.CTkTextbox(content, height=150, wrap="word")
            synopsis_box.pack(fill="x", padx=10, pady=5)
            synopsis_box.insert("1.0", book[7])
            synopsis_box.configure(state="disabled")
        
        # Botones
        actions = ctk.CTkFrame(modal)
        actions.pack(fill="x", padx=20, pady=(0, 20))
        
        ctk.CTkButton(actions, text="Ô£Å´©Å Editar", command=lambda: self.editar_libro_from_modal(book, modal), width=120, height=40, fg_color="#3498db", hover_color="#2980b9").pack(side="left", padx=5)
        ctk.CTkButton(actions, text="­ƒùæ´©Å Eliminar", command=lambda: self.eliminar_libro_from_modal(book, modal), width=120, height=40, fg_color="#e74c3c", hover_color="#c0392b").pack(side="left", padx=5)
        ctk.CTkButton(actions, text="Cerrar", command=modal.destroy, width=120, height=40).pack(side="right", padx=5)
    
    def editar_libro_from_modal(self, book, modal):
        modal.destroy()
        self.current_libro = book
        self.show_edicion()
    
    def eliminar_libro_from_modal(self, book, modal):
        """Eliminar libro desde modal"""
        if messagebox.askyesno("Confirmar Eliminaci├│n", f"┬┐Est├í seguro de que desea eliminar el libro '{book[2]}'?\n\nEsta acci├│n no se puede deshacer."):
            modal.destroy()
            messagebox.showinfo("Eliminar", "Funcionalidad de eliminar en desarrollo")
            self.cargar_libros()
    
    def first_page(self):
        """Ir a la primera p├ígina"""
        if self.current_page > 0:
            self.current_page = 0
            self.cargar_libros()
    
    def prev_page(self):
        if self.current_page > 0:
            self.current_page -= 1
            self.cargar_libros()
    
    def next_page(self):
        total_pages = (self.total_books + self.items_per_page - 1) // self.items_per_page
        if self.current_page < total_pages - 1:
            self.current_page += 1
            self.cargar_libros()
    
    def last_page(self):
        """Ir a la ├║ltima p├ígina"""
        total_pages = (self.total_books + self.items_per_page - 1) // self.items_per_page
        if self.current_page < total_pages - 1:
            self.current_page = total_pages - 1
            self.cargar_libros()
    
    def goto_page(self):
        """Ir a p├ígina espec├¡fica"""
        try:
            page_num = int(self.page_entry.get())
            total_pages = max(1, (self.total_books + self.items_per_page - 1) // self.items_per_page)
            
            if 1 <= page_num <= total_pages:
                self.current_page = page_num - 1
                self.cargar_libros()
            else:
                messagebox.showwarning("P├ígina inv├ílida", f"Por favor ingrese un n├║mero entre 1 y {total_pages}")
        except ValueError:
            messagebox.showwarning("Entrada inv├ílida", "Por favor ingrese un n├║mero v├ílido")
    
    def update_pagination_controls(self):
        if not hasattr(self, 'page_label'):
            return
        
        total_pages = max(1, (self.total_books + self.items_per_page - 1) // self.items_per_page)
        current = self.current_page + 1
        
        self.page_label.configure(text=f"P├ígina {current} de {total_pages} ({self.total_books} libros)")
        
        # Habilitar/deshabilitar botones
        self.first_btn.configure(state="normal" if self.current_page > 0 else "disabled")
        self.prev_btn.configure(state="normal" if self.current_page > 0 else "disabled")
        self.next_btn.configure(state="normal" if self.current_page < total_pages - 1 else "disabled")
        self.last_btn.configure(state="normal" if self.current_page < total_pages - 1 else "disabled")
        
        # Actualizar botones de n├║meros de p├ígina
        for widget in self.pages_frame.winfo_children():
            widget.destroy()
        
        # Mostrar hasta 10 n├║meros de p├ígina
        start_page = max(0, self.current_page - 5)
        end_page = min(total_pages, start_page + 10)
        
        if start_page > 0:
            ctk.CTkLabel(self.pages_frame, text="...", font=ctk.CTkFont(size=12)).pack(side="left", padx=2)
        
        for i in range(start_page, end_page):
            page_num = i + 1
            if i == self.current_page:
                btn = ctk.CTkButton(
                    self.pages_frame,
                    text=str(page_num),
                    width=35,
                    height=32,
                    fg_color=("#3498db", "#2980b9"),
                    command=lambda p=i: self.jump_to_page(p)
                )
            else:
                btn = ctk.CTkButton(
                    self.pages_frame,
                    text=str(page_num),
                    width=35,
                    height=32,
                    fg_color="transparent",
                    border_width=1,
                    command=lambda p=i: self.jump_to_page(p)
                )
            btn.pack(side="left", padx=1)
        
        if end_page < total_pages:
            ctk.CTkLabel(self.pages_frame, text="...", font=ctk.CTkFont(size=12)).pack(side="left", padx=2)
    
    def jump_to_page(self, page_index):
        """Saltar a p├ígina espec├¡fica"""
        self.current_page = page_index
        self.cargar_libros()
    
    def limpiar_filtros(self):
        """Limpiar filtros de b├║squeda y recargar cat├ílogo completo"""
        self.search_entry.delete(0, 'end')
        self.current_page = 0
        self.cargar_libros()
    
    def buscar_libros(self):
        search_term = self.search_entry.get().strip()
        
        if not search_term:
            self.current_page = 0
            self.cargar_libros()
            return
        
        for widget in self.books_scroll.winfo_children():
            widget.destroy()
        
        try:
            source = self.source_var.get().lower()
            search_filter = self.search_filter_var.get().lower()
            
            # Construir SQL seg├║n el filtro seleccionado
            if search_filter == "t├¡tulo":
                where_clause = "t.titulo LIKE ?"
                params = (f"%{search_term}%",)
            elif search_filter == "autor":
                where_clause = "a.nombreAutor LIKE ?"
                params = (f"%{search_term}%",)
            elif search_filter == "ean":
                where_clause = "t.EAN LIKE ?"
                params = (f"%{search_term}%",)
            else:
                where_clause = "t.titulo LIKE ?"
                params = (f"%{search_term}%",)
            
            sql = f"""
                SELECT t.id, t.EAN, t.titulo, a.nombreAutor, e.descriEditorial, 
                       t.anyoEdicion, t.portada_cloudinary, t.sinopsis
                FROM core_titulos t
                LEFT JOIN core_autores a ON t.codiAutor_id = a.id
                LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
                WHERE {where_clause}
                ORDER BY t.titulo
                LIMIT 100
            """
            
            if source == "local":
                books = self.query_local(sql, params)
            else:
                books = self.query_turso(sql, list(params))
            
            if books:
                for book in books:
                    self.create_book_row(book)
                ctk.CTkLabel(self.books_scroll, text=f"Resultados: {len(books)} libro(s) encontrado(s)", font=ctk.CTkFont(size=12, weight="bold")).pack(pady=10)
            else:
                ctk.CTkLabel(self.books_scroll, text=f"No se encontraron resultados para '{search_term}' en {search_filter}", font=ctk.CTkFont(size=14)).pack(pady=20)
        except Exception as e:
            ctk.CTkLabel(self.books_scroll, text=f"Error: {str(e)}", font=ctk.CTkFont(size=14)).pack(pady=20)
    
    def show_edicion(self):
        self.clear_main_frame()
        self.highlight_nav_button("Ô£Å´©Å Editar/Crear")
        
        ctk.CTkLabel(self.main_frame, text="Vista de Edici├│n - En desarrollo", font=ctk.CTkFont(size=20)).pack(pady=100)
    
    def show_autores(self):
        self.clear_main_frame()
        self.highlight_nav_button("👤 Autores")
        
        # Header con búsqueda y botón crear
        header = ctk.CTkFrame(self.main_frame)
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        # Título y botón crear
        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.pack(side="left", expand=True, padx=20)
        
        ctk.CTkLabel(title_frame, text="Gestión de Autores", font=ctk.CTkFont(size=28, weight="bold")).pack(side="left")
        ctk.CTkButton(title_frame, text="➕ Crear Autor", command=self.crear_autor, width=120).pack(side="right", padx=(20, 0))
        
        # Búsqueda
        search_frame = ctk.CTkFrame(header, fg_color="transparent")
        search_frame.pack(side="right", padx=5)
        
        self.autores_search_entry = ctk.CTkEntry(search_frame, placeholder_text="Buscar autor...", width=250)
        self.autores_search_entry.pack(side="left", padx=5)
        self.autores_search_entry.bind("<Return>", lambda e: self.buscar_autores())
        
        ctk.CTkButton(search_frame, text="🔍", command=self.buscar_autores, width=40).pack(side="left", padx=2)
        ctk.CTkButton(search_frame, text="✖ Limpiar", command=self.limpiar_busqueda_autores, width=80).pack(side="left", padx=2)
        
        # Tabla de autores
        table_frame = ctk.CTkFrame(self.main_frame)
        table_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.autores_scroll = ctk.CTkScrollableFrame(table_frame, label_text="Autores Registrados", label_font=ctk.CTkFont(size=16, weight="bold"))
        self.autores_scroll.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Paginación para autores
        self.autores_pagination_frame = ctk.CTkFrame(self.main_frame)
        self.autores_pagination_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        # Variables para paginación de autores
        self.autores_current_page = 0
        self.autores_items_per_page = 50
        self.autores_total = 0
        
        self.cargar_autores()
    
    # Métodos para gestión de Autores
    def cargar_autores(self):
        """Cargar autores con paginación y ordenación alfabética accent-insensitive"""
        if not hasattr(self, 'autores_scroll'):
            return
        
        for widget in self.autores_scroll.winfo_children():
            widget.destroy()
        
        try:
            offset = self.autores_current_page * self.autores_items_per_page
            
            # Contar total
            count_result = self.query_local("SELECT COUNT(*) FROM core_autores")
            self.autores_total = count_result[0][0] if count_result else 0
            
            # Cargar autores con ordenación accent-insensitive
            autores = self.query_local(f"""
                SELECT id, nombreAutor, enlaceWiki, enlaceWiki2, observaciones
                FROM core_autores 
                ORDER BY nombreAutor COLLATE NOCASE
                LIMIT {self.autores_items_per_page} OFFSET {offset}
            """)
            
            if autores:
                # Header de la tabla
                header_row = ctk.CTkFrame(self.autores_scroll, fg_color=("#e0e0e0", "#2b2b2b"))
                header_row.pack(fill="x", pady=(0, 5))
                
                ctk.CTkLabel(header_row, text="ID", font=ctk.CTkFont(size=14, weight="bold"), width=80).pack(side="left", padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Nombre", font=ctk.CTkFont(size=14, weight="bold"), anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Acciones", font=ctk.CTkFont(size=14, weight="bold"), width=200).pack(side="left", padx=10, pady=10)
                
                for autor in autores:
                    self.create_autor_row(autor)
            else:
                ctk.CTkLabel(self.autores_scroll, text="No hay autores registrados", font=ctk.CTkFont(size=14)).pack(pady=20)
            
            self.update_autores_pagination()
        except Exception as e:
            ctk.CTkLabel(self.autores_scroll, text=f"Error: {str(e)}", font=ctk.CTkFont(size=14)).pack(pady=20)
    
    def create_autor_row(self, autor):
        """Crear fila de autor con botones de acción"""
        row = ctk.CTkFrame(self.autores_scroll)
        row.pack(fill="x", pady=2)
        
        # ID
        ctk.CTkLabel(row, text=str(autor[0]), width=80).pack(side="left", padx=10, pady=8)
        
        # Nombre
        nombre_text = autor[1] if autor[1] else "Sin nombre"
        ctk.CTkLabel(row, text=nombre_text, anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=8)
        
        # Botones de acción
        buttons_frame = ctk.CTkFrame(row, fg_color="transparent")
        buttons_frame.pack(side="right", padx=10, pady=5)
        
        ctk.CTkButton(buttons_frame, text="✏️ Editar", width=70, height=30, command=lambda a=autor: self.editar_autor(a)).pack(side="left", padx=2)
        ctk.CTkButton(buttons_frame, text="🗑️ Eliminar", width=70, height=30, command=lambda a=autor: self.eliminar_autor(a)).pack(side="left", padx=2)
    
    def crear_autor(self):
        """Abrir formulario para crear nuevo autor"""
        self.mostrar_formulario_autor(None)
    
    def editar_autor(self, autor):
        """Abrir formulario para editar autor existente"""
        self.mostrar_formulario_autor(autor)
    
    def eliminar_autor(self, autor):
        """Eliminar autor con verificación de integridad referencial"""
        if not autor or len(autor) == 0:
            messagebox.showerror("Error", "No se ha seleccionado ningún autor")
            return
        
        autor_id = autor[0]
        autor_nombre = autor[1] if len(autor) > 1 else "desconocido"
        
        # Verificar si hay libros asociados
        try:
            libros_result = self.query_local("SELECT COUNT(*) FROM core_titulos WHERE codiAutor_id = ?", (autor_id,))
            num_libros = libros_result[0][0] if libros_result else 0
            
            if num_libros > 0:
                messagebox.showerror(
                    "Error de Integridad", 
                    f"No se puede eliminar el autor '{autor_nombre}' porque tiene {num_libros} libro(s) asociado(s).\n\n"
                    f"Debe eliminar o reasignar esos libros primero."
                )
                return
        except Exception as e:
            messagebox.showerror("Error", f"Error al verificar libros asociados: {str(e)}")
            return
        
        if messagebox.askyesno("Confirmar Eliminación", f"¿Está seguro de eliminar el autor '{autor_nombre}'?"):
            try:
                result = self.query_local("DELETE FROM core_autores WHERE id = ?", (autor_id,))
                
                if result is not None:
                    messagebox.showinfo("Éxito", f"Autor '{autor_nombre}' eliminado correctamente")
                    self.cargar_autores()
                    # Actualizar cache
                    self.load_initial_data()
                else:
                    messagebox.showerror("Error", "No se pudo eliminar el autor")
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar autor: {str(e)}")
    
    def mostrar_formulario_autor(self, autor):
        """Mostrar formulario para crear/editar autor con todos los campos"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Editar Autor" if autor else "Crear Autor")
        dialog.geometry("600x500")
        dialog.transient(self)
        dialog.grab_set()
        
        # Form frame
        form_frame = ctk.CTkScrollableFrame(dialog)
        form_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Campos del formulario
        fields = {}
        
        # Nombre (obligatorio)
        ctk.CTkLabel(form_frame, text="Nombre del Autor *", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['nombre'] = ctk.CTkEntry(form_frame, placeholder_text="Nombre completo del autor")
        fields['nombre'].pack(fill="x", pady=(0, 10))
        
        # Enlace Wiki 1
        ctk.CTkLabel(form_frame, text="Enlace Wikipedia 1", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['wiki1'] = ctk.CTkEntry(form_frame, placeholder_text="URL de Wikipedia")
        fields['wiki1'].pack(fill="x", pady=(0, 10))
        
        # Enlace Wiki 2
        ctk.CTkLabel(form_frame, text="Enlace Wikipedia 2", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['wiki2'] = ctk.CTkEntry(form_frame, placeholder_text="URL secundaria de Wikipedia")
        fields['wiki2'].pack(fill="x", pady=(0, 10))
        
        # Observaciones
        ctk.CTkLabel(form_frame, text="Observaciones", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['observaciones'] = ctk.CTkTextbox(form_frame, height=100)
        fields['observaciones'].pack(fill="x", pady=(0, 10))
        
        # Cargar datos si es edición
        if autor:
            fields['nombre'].insert(0, autor[1] if len(autor) > 1 else "")
            fields['wiki1'].insert(0, autor[2] if len(autor) > 2 else "")
            fields['wiki2'].insert(0, autor[3] if len(autor) > 3 else "")
            if len(autor) > 4 and autor[4]:
                fields['observaciones'].insert("0.0", autor[4])
        
        # Botones
        button_frame = ctk.CTkFrame(dialog)
        button_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        def guardar():
            try:
                nombre = fields['nombre'].get().strip()
                wiki1 = fields['wiki1'].get().strip()
                wiki2 = fields['wiki2'].get().strip()
                observaciones = fields['observaciones'].get("0.0", "end").strip()
                
                if not nombre:
                    messagebox.showerror("Error", "El nombre del autor es obligatorio")
                    return
                
                if autor:
                    # Actualizar
                    sql = """
                        UPDATE core_autores 
                        SET nombreAutor = ?, enlaceWiki = ?, enlaceWiki2 = ?, observaciones = ?, updated = datetime('now')
                        WHERE id = ?
                    """
                    params = (nombre, wiki1, wiki2, observaciones, autor[0])
                else:
                    # Verificar duplicado
                    existing = self.query_local("SELECT id FROM core_autores WHERE nombreAutor = ?", (nombre,))
                    if existing:
                        messagebox.showerror("Error", f"Ya existe un autor con el nombre '{nombre}'")
                        return
                    
                    # Insertar
                    sql = """
                        INSERT INTO core_autores (nombreAutor, enlaceWiki, enlaceWiki2, observaciones, created, updated)
                        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                    """
                    params = (nombre, wiki1, wiki2, observaciones)
                
                result = self.query_local(sql, params)
                
                if result is not None:
                    messagebox.showinfo("Éxito", "Autor guardado correctamente")
                    dialog.destroy()
                    self.cargar_autores()
                    self.load_initial_data()  # Actualizar cache
                else:
                    messagebox.showerror("Error", "No se pudo guardar el autor")
                    
            except Exception as e:
                messagebox.showerror("Error", f"Error al guardar autor: {str(e)}")
        
        ctk.CTkButton(button_frame, text="Guardar", command=guardar, width=120).pack(side="right", padx=5)
        ctk.CTkButton(button_frame, text="Cancelar", command=dialog.destroy, width=120).pack(side="right", padx=5)
    
    def buscar_autores(self):
        """Buscar autores con filtro"""
        search_term = self.autores_search_entry.get().strip()
        
        if not search_term:
            self.cargar_autores()
            return
        
        for widget in self.autores_scroll.winfo_children():
            widget.destroy()
        
        try:
            autores = self.query_local("""
                SELECT id, nombreAutor, enlaceWiki, enlaceWiki2, observaciones
                FROM core_autores 
                WHERE nombreAutor LIKE ? COLLATE NOCASE
                ORDER BY nombreAutor COLLATE NOCASE
                LIMIT 100
            """, (f"%{search_term}%",))
            
            if autores:
                # Header
                header_row = ctk.CTkFrame(self.autores_scroll, fg_color=("#e0e0e0", "#2b2b2b"))
                header_row.pack(fill="x", pady=(0, 5))
                
                ctk.CTkLabel(header_row, text="ID", font=ctk.CTkFont(size=14, weight="bold"), width=80).pack(side="left", padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Nombre", font=ctk.CTkFont(size=14, weight="bold"), anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Acciones", font=ctk.CTkFont(size=14, weight="bold"), width=200).pack(side="left", padx=10, pady=10)
                
                for autor in autores:
                    self.create_autor_row(autor)
                
                ctk.CTkLabel(self.autores_scroll, text=f"Resultados: {len(autores)} autor(es)", font=ctk.CTkFont(size=12, weight="bold")).pack(pady=10)
            else:
                ctk.CTkLabel(self.autores_scroll, text=f"No se encontraron resultados para '{search_term}'", font=ctk.CTkFont(size=14)).pack(pady=20)
        except Exception as e:
            ctk.CTkLabel(self.autores_scroll, text=f"Error: {str(e)}", font=ctk.CTkFont(size=14)).pack(pady=20)
    
    def limpiar_busqueda_autores(self):
        """Limpiar búsqueda y recargar autores"""
        self.autores_search_entry.delete(0, 'end')
        self.cargar_autores()
    
    def update_autores_pagination(self):
        """Actualizar controles de paginación de autores"""
        if not hasattr(self, 'autores_pagination_frame'):
            return
        
        for widget in self.autores_pagination_frame.winfo_children():
            widget.destroy()
        
        total_pages = max(1, (self.autores_total + self.autores_items_per_page - 1) // self.autores_items_per_page)
        current = self.autores_current_page + 1
        
        # Info de página
        info_label = ctk.CTkLabel(self.autores_pagination_frame, text=f"Página {current} de {total_pages} ({self.autores_total} autores)", font=ctk.CTkFont(size=12))
        info_label.pack(side="left", padx=10)
        
        # Botones de navegación
        nav_frame = ctk.CTkFrame(self.autores_pagination_frame, fg_color="transparent")
        nav_frame.pack(side="right", padx=10)
        
        ctk.CTkButton(nav_frame, text="⏮ Primera", command=self.autores_first_page, width=80).pack(side="left", padx=2)
        ctk.CTkButton(nav_frame, text="◀ Anterior", command=self.autores_prev_page, width=80).pack(side="left", padx=2)
        ctk.CTkButton(nav_frame, text="Siguiente ▶", command=self.autores_next_page, width=80).pack(side="left", padx=2)
        ctk.CTkButton(nav_frame, text="Última ⏭", command=self.autores_last_page, width=80).pack(side="left", padx=2)
    
    def autores_first_page(self):
        self.autores_current_page = 0
        self.cargar_autores()
    
    def autores_prev_page(self):
        if self.autores_current_page > 0:
            self.autores_current_page -= 1
            self.cargar_autores()
    
    def autores_next_page(self):
        total_pages = (self.autores_total + self.autores_items_per_page - 1) // self.autores_items_per_page
        if self.autores_current_page < total_pages - 1:
            self.autores_current_page += 1
            self.cargar_autores()
    
    def autores_last_page(self):
        total_pages = (self.autores_total + self.autores_items_per_page - 1) // self.autores_items_per_page
        self.autores_current_page = max(0, total_pages - 1)
        self.cargar_autores()
    
    def show_editoriales(self):
        self.clear_main_frame()
        self.highlight_nav_button("🏢 Editoriales")
        
        # Header con búsqueda y botón crear
        header = ctk.CTkFrame(self.main_frame)
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        # Título y botón crear
        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.pack(side="left", expand=True, padx=20)
        
        ctk.CTkLabel(title_frame, text="Gestión de Editoriales", font=ctk.CTkFont(size=28, weight="bold")).pack(side="left")
        ctk.CTkButton(title_frame, text="➕ Crear Editorial", command=self.crear_editorial, width=140).pack(side="right", padx=(20, 0))
        
        # Búsqueda
        search_frame = ctk.CTkFrame(header, fg_color="transparent")
        search_frame.pack(side="right", padx=5)
        
        self.editoriales_search_entry = ctk.CTkEntry(search_frame, placeholder_text="Buscar editorial...", width=250)
        self.editoriales_search_entry.pack(side="left", padx=5)
        self.editoriales_search_entry.bind("<Return>", lambda e: self.buscar_editoriales())
        
        ctk.CTkButton(search_frame, text="🔍", command=self.buscar_editoriales, width=40).pack(side="left", padx=2)
        ctk.CTkButton(search_frame, text="✖ Limpiar", command=self.limpiar_busqueda_editoriales, width=80).pack(side="left", padx=2)
        
        # Tabla de editoriales
        table_frame = ctk.CTkFrame(self.main_frame)
        table_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.editoriales_scroll = ctk.CTkScrollableFrame(table_frame, label_text="Editoriales Registradas", label_font=ctk.CTkFont(size=16, weight="bold"))
        self.editoriales_scroll.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Paginación para editoriales
        self.editoriales_pagination_frame = ctk.CTkFrame(self.main_frame)
        self.editoriales_pagination_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        # Variables para paginación de editoriales
        self.editoriales_current_page = 0
        self.editoriales_items_per_page = 50
        self.editoriales_total = 0
        
        self.cargar_editoriales()
    
    # Métodos para gestión de Editoriales
    def cargar_editoriales(self):
        """Cargar editoriales con paginación y ordenación alfabética accent-insensitive"""
        if not hasattr(self, 'editoriales_scroll'):
            return
        
        for widget in self.editoriales_scroll.winfo_children():
            widget.destroy()
        
        try:
            offset = self.editoriales_current_page * self.editoriales_items_per_page
            
            # Contar total
            count_result = self.query_local("SELECT COUNT(*) FROM core_editoriales")
            self.editoriales_total = count_result[0][0] if count_result else 0
            
            # Cargar editoriales con ordenación accent-insensitive
            editoriales = self.query_local(f"""
                SELECT id, descriEditorial
                FROM core_editoriales 
                ORDER BY descriEditorial COLLATE NOCASE
                LIMIT {self.editoriales_items_per_page} OFFSET {offset}
            """)
            
            if editoriales:
                # Header de la tabla
                header_row = ctk.CTkFrame(self.editoriales_scroll, fg_color=("#e0e0e0", "#2b2b2b"))
                header_row.pack(fill="x", pady=(0, 5))
                
                ctk.CTkLabel(header_row, text="ID", font=ctk.CTkFont(size=14, weight="bold"), width=80).pack(side="left", padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Nombre", font=ctk.CTkFont(size=14, weight="bold"), anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Acciones", font=ctk.CTkFont(size=14, weight="bold"), width=200).pack(side="left", padx=10, pady=10)
                
                for editorial in editoriales:
                    self.create_editorial_row(editorial)
            else:
                ctk.CTkLabel(self.editoriales_scroll, text="No hay editoriales registradas", font=ctk.CTkFont(size=14)).pack(pady=20)
            
            self.update_editoriales_pagination()
        except Exception as e:
            ctk.CTkLabel(self.editoriales_scroll, text=f"Error: {str(e)}", font=ctk.CTkFont(size=14)).pack(pady=20)
    
    def create_editorial_row(self, editorial):
        """Crear fila de editorial con botones de acción"""
        row = ctk.CTkFrame(self.editoriales_scroll)
        row.pack(fill="x", pady=2)
        
        # ID
        ctk.CTkLabel(row, text=str(editorial[0]), width=80).pack(side="left", padx=10, pady=8)
        
        # Nombre
        nombre_text = editorial[1] if editorial[1] else "Sin nombre"
        ctk.CTkLabel(row, text=nombre_text, anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=8)
        
        # Botones de acción
        buttons_frame = ctk.CTkFrame(row, fg_color="transparent")
        buttons_frame.pack(side="right", padx=10, pady=5)
        
        ctk.CTkButton(buttons_frame, text="✏️ Editar", width=70, height=30, command=lambda e=editorial: self.editar_editorial(e)).pack(side="left", padx=2)
        ctk.CTkButton(buttons_frame, text="🗑️ Eliminar", width=70, height=30, command=lambda e=editorial: self.eliminar_editorial(e)).pack(side="left", padx=2)
    
    def crear_editorial(self):
        """Abrir formulario para crear nueva editorial"""
        self.mostrar_formulario_editorial(None)
    
    def editar_editorial(self, editorial):
        """Abrir formulario para editar editorial existente"""
        self.mostrar_formulario_editorial(editorial)
    
    def eliminar_editorial(self, editorial):
        """Eliminar editorial con verificación de integridad referencial"""
        if not editorial or len(editorial) == 0:
            messagebox.showerror("Error", "No se ha seleccionado ninguna editorial")
            return
        
        editorial_id = editorial[0]
        editorial_nombre = editorial[1] if len(editorial) > 1 else "desconocida"
        
        # Verificar si hay libros asociados
        try:
            libros_result = self.query_local("SELECT COUNT(*) FROM core_titulos WHERE codiEditorial_id = ?", (editorial_id,))
            num_libros = libros_result[0][0] if libros_result else 0
            
            if num_libros > 0:
                messagebox.showerror(
                    "Error de Integridad", 
                    f"No se puede eliminar la editorial '{editorial_nombre}' porque tiene {num_libros} libro(s) asociado(s).\n\n"
                    f"Debe eliminar o reasignar esos libros primero."
                )
                return
        except Exception as e:
            messagebox.showerror("Error", f"Error al verificar libros asociados: {str(e)}")
            return
        
        if messagebox.askyesno("Confirmar Eliminación", f"¿Está seguro de eliminar la editorial '{editorial_nombre}'?"):
            try:
                result = self.query_local("DELETE FROM core_editoriales WHERE id = ?", (editorial_id,))
                
                if result is not None:
                    messagebox.showinfo("Éxito", f"Editorial '{editorial_nombre}' eliminada correctamente")
                    self.cargar_editoriales()
                    # Actualizar cache
                    self.load_initial_data()
                else:
                    messagebox.showerror("Error", "No se pudo eliminar la editorial")
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar editorial: {str(e)}")
    
    def mostrar_formulario_editorial(self, editorial):
        """Mostrar formulario para crear/editar editorial"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Editar Editorial" if editorial else "Crear Editorial")
        dialog.geometry("500x300")
        dialog.transient(self)
        dialog.grab_set()
        
        # Form frame
        form_frame = ctk.CTkFrame(dialog)
        form_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Campo del formulario
        ctk.CTkLabel(form_frame, text="Nombre de la Editorial *", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        
        nombre_entry = ctk.CTkEntry(form_frame, placeholder_text="Nombre completo de la editorial")
        nombre_entry.pack(fill="x", pady=(0, 20))
        
        # Cargar datos si es edición
        if editorial:
            nombre_entry.insert(0, editorial[1] if len(editorial) > 1 else "")
        
        # Botones
        button_frame = ctk.CTkFrame(dialog)
        button_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        def guardar():
            try:
                nombre = nombre_entry.get().strip()
                
                if not nombre:
                    messagebox.showerror("Error", "El nombre de la editorial es obligatorio")
                    return
                
                if editorial:
                    # Actualizar
                    sql = """
                        UPDATE core_editorials 
                        SET descriEditorial = ?, updated = datetime('now')
                        WHERE id = ?
                    """
                    params = (nombre, editorial[0])
                else:
                    # Verificar duplicado
                    existing = self.query_local("SELECT id FROM core_editorials WHERE descriEditorial = ?", (nombre,))
                    if existing:
                        messagebox.showerror("Error", f"Ya existe una editorial con el nombre '{nombre}'")
                        return
                    
                    # Insertar
                    sql = """
                        INSERT INTO core_editorials (descriEditorial, created, updated)
                        VALUES (?, datetime('now'), datetime('now'))
                    """
                    params = (nombre,)
                
                result = self.query_local(sql, params)
                
                if result is not None:
                    messagebox.showinfo("Éxito", "Editorial guardada correctamente")
                    dialog.destroy()
                    self.cargar_editoriales()
                    self.load_initial_data()  # Actualizar cache
                else:
                    messagebox.showerror("Error", "No se pudo guardar la editorial")
                    
            except Exception as e:
                messagebox.showerror("Error", f"Error al guardar editorial: {str(e)}")
        
        ctk.CTkButton(button_frame, text="Guardar", command=guardar, width=120).pack(side="right", padx=5)
        ctk.CTkButton(button_frame, text="Cancelar", command=dialog.destroy, width=120).pack(side="right", padx=5)
    
    def buscar_editoriales(self):
        """Buscar editoriales con filtro"""
        search_term = self.editoriales_search_entry.get().strip()
        
        if not search_term:
            self.cargar_editoriales()
            return
        
        for widget in self.editoriales_scroll.winfo_children():
            widget.destroy()
        
        try:
            editoriales = self.query_local("""
                SELECT id, descriEditorial
                FROM core_editorials 
                WHERE descriEditorial LIKE ? COLLATE NOCASE
                ORDER BY descriEditorial COLLATE NOCASE
                LIMIT 100
            """, (f"%{search_term}%",))
            
            if editoriales:
                # Header
                header_row = ctk.CTkFrame(self.editoriales_scroll, fg_color=("#e0e0e0", "#2b2b2b"))
                header_row.pack(fill="x", pady=(0, 5))
                
                ctk.CTkLabel(header_row, text="ID", font=ctk.CTkFont(size=14, weight="bold"), width=80).pack(side="left", padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Nombre", font=ctk.CTkFont(size=14, weight="bold"), anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=10)
                ctk.CTkLabel(header_row, text="Acciones", font=ctk.CTkFont(size=14, weight="bold"), width=200).pack(side="left", padx=10, pady=10)
                
                for editorial in editoriales:
                    self.create_editorial_row(editorial)
                
                ctk.CTkLabel(self.editoriales_scroll, text=f"Resultados: {len(editoriales)} editorial(es)", font=ctk.CTkFont(size=12, weight="bold")).pack(pady=10)
            else:
                ctk.CTkLabel(self.editoriales_scroll, text=f"No se encontraron resultados para '{search_term}'", font=ctk.CTkFont(size=14)).pack(pady=20)
        except Exception as e:
            ctk.CTkLabel(self.editoriales_scroll, text=f"Error: {str(e)}", font=ctk.CTkFont(size=14)).pack(pady=20)
    
    def limpiar_busqueda_editoriales(self):
        """Limpiar búsqueda y recargar editoriales"""
        self.editoriales_search_entry.delete(0, 'end')
        self.cargar_editoriales()
    
    def update_editoriales_pagination(self):
        """Actualizar controles de paginación de editoriales"""
        if not hasattr(self, 'editoriales_pagination_frame'):
            return
        
        for widget in self.editoriales_pagination_frame.winfo_children():
            widget.destroy()
        
        total_pages = max(1, (self.editoriales_total + self.editoriales_items_per_page - 1) // self.editoriales_items_per_page)
        current = self.editoriales_current_page + 1
        
        # Info de página
        info_label = ctk.CTkLabel(self.editoriales_pagination_frame, text=f"Página {current} de {total_pages} ({self.editoriales_total} editoriales)", font=ctk.CTkFont(size=12))
        info_label.pack(side="left", padx=10)
        
        # Botones de navegación
        nav_frame = ctk.CTkFrame(self.editoriales_pagination_frame, fg_color="transparent")
        nav_frame.pack(side="right", padx=10)
        
        ctk.CTkButton(nav_frame, text="⏮ Primera", command=self.editoriales_first_page, width=80).pack(side="left", padx=2)
        ctk.CTkButton(nav_frame, text="◀ Anterior", command=self.editoriales_prev_page, width=80).pack(side="left", padx=2)
        ctk.CTkButton(nav_frame, text="Siguiente ▶", command=self.editoriales_next_page, width=80).pack(side="left", padx=2)
        ctk.CTkButton(nav_frame, text="Última ⏭", command=self.editoriales_last_page, width=80).pack(side="left", padx=2)
    
    def editoriales_first_page(self):
        self.editoriales_current_page = 0
        self.cargar_editoriales()
    
    def editoriales_prev_page(self):
        if self.editoriales_current_page > 0:
            self.editoriales_current_page -= 1
            self.cargar_editoriales()
    
    def editoriales_next_page(self):
        total_pages = (self.editoriales_total + self.editoriales_items_per_page - 1) // self.editoriales_items_per_page
        if self.editoriales_current_page < total_pages - 1:
            self.editoriales_current_page += 1
            self.cargar_editoriales()
    
    def editoriales_last_page(self):
        total_pages = (self.editoriales_total + self.editoriales_items_per_page - 1) // self.editoriales_items_per_page
        self.editoriales_current_page = max(0, total_pages - 1)
        self.cargar_editoriales()
    
    def query_local(self, sql, params=None):
        try:
            conn = sqlite3.connect(self.local_db)
            cursor = conn.cursor()
            
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            if sql.strip().upper().startswith('SELECT'):
                result = cursor.fetchall()
            else:
                conn.commit()
                result = cursor.rowcount
            
            conn.close()
            return result
        except Exception as e:
            print(f"Error en query local: {str(e)}")
            return None
    
    def query_turso(self, sql, params=None):
        try:
            payload = {"statements": [sql]} if not params else [{"q": sql, "params": params}]
            response = requests.post(
                self.turso_url,
                headers={
                    "Authorization": f"Bearer {self.turso_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                if 'results' in data[0]:
                    results = data[0]['results']
                    if 'error' in results:
                        return None
                    return results.get('rows', [])
            return None
        except Exception as e:
            print(f"Error en query Turso: {str(e)}")
            return None
    
    def load_initial_data(self):
        try:
            autores = self.query_local("SELECT id, nombreAutor FROM core_autores ORDER BY nombreAutor")
            if autores:
                self.autores_cache = {row[0]: row[1] for row in autores}
        except:
            pass
        
        try:
            editoriales = self.query_local("SELECT id, descriEditorial FROM core_editoriales ORDER BY descriEditorial")
            if editoriales:
                self.editoriales_cache = {row[0]: row[1] for row in editoriales}
        except:
            pass
    
    # Métodos CRUD para Libros
    def crear_libro(self):
        """Abrir formulario para crear nuevo libro"""
        self.mostrar_formulario_libro(None)
    
    def editar_libro(self, libro):
        """Abrir formulario para editar libro existente"""
        self.mostrar_formulario_libro(libro)
    
    def eliminar_libro(self, libro):
        """Eliminar libro con confirmación"""
        if not libro or len(libro) == 0:
            messagebox.showerror("Error", "No se ha seleccionado ningún libro")
            return
        
        libro_id = libro[0]
        libro_titulo = libro[2] if len(libro) > 2 else "desconocido"
        
        if messagebox.askyesno("Confirmar Eliminación", f"¿Está seguro de eliminar el libro '{libro_titulo}'?"):
            try:
                # Eliminar de la base de datos local
                result = self.query_local("DELETE FROM core_titulos WHERE id = ?", (libro_id,))
                
                if result is not None:
                    messagebox.showinfo("Éxito", f"Libro '{libro_titulo}' eliminado correctamente")
                    self.cargar_libros()  # Recargar la lista
                else:
                    messagebox.showerror("Error", "No se pudo eliminar el libro")
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar libro: {str(e)}")
    
    def mostrar_formulario_libro(self, libro):
        """Mostrar formulario para crear/editar libro"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Editar Libro" if libro else "Crear Libro")
        dialog.geometry("900x700")
        dialog.transient(self)
        dialog.grab_set()
        
        # Scrollable frame para el formulario
        form_frame = ctk.CTkScrollableFrame(dialog)
        form_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Campos del formulario
        fields = {}
        
        # EAN (obligatorio)
        ctk.CTkLabel(form_frame, text="EAN *", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['ean'] = ctk.CTkEntry(form_frame, placeholder_text="Código EAN")
        fields['ean'].pack(fill="x", pady=(0, 10))
        
        # Título (obligatorio)
        ctk.CTkLabel(form_frame, text="Título *", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['titulo'] = ctk.CTkEntry(form_frame, placeholder_text="Título del libro")
        fields['titulo'].pack(fill="x", pady=(0, 10))
        
        # Autor (dropdown)
        ctk.CTkLabel(form_frame, text="Autor *", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        autores_list = list(self.autores_cache.values())
        fields['autor'] = ctk.CTkComboBox(form_frame, values=["Seleccionar autor..."] + autores_list)
        fields['autor'].pack(fill="x", pady=(0, 10))
        
        # Editorial (dropdown)
        ctk.CTkLabel(form_frame, text="Editorial *", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        editoriales_list = list(self.editoriales_cache.values())
        fields['editorial'] = ctk.CTkComboBox(form_frame, values=["Seleccionar editorial..."] + editoriales_list)
        fields['editorial'].pack(fill="x", pady=(0, 10))
        
        # Estante (dropdown desde ubicaciones_sub)
        ctk.CTkLabel(form_frame, text="Estante", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        try:
            estantes_result = self.query_local("SELECT descriEstante FROM core_ubicaciones_sub ORDER BY descriEstante")
            estantes_list = [row[0] for row in estantes_result] if estantes_result else []
            fields['estante'] = ctk.CTkComboBox(form_frame, values=["Seleccionar estante..."] + estantes_list)
        except:
            fields['estante'] = ctk.CTkComboBox(form_frame, values=["Seleccionar estante..."])
        fields['estante'].pack(fill="x", pady=(0, 10))
        
        # Año de edición
        ctk.CTkLabel(form_frame, text="Año de Edición", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['anyo'] = ctk.CTkEntry(form_frame, placeholder_text="Año de edición")
        fields['anyo'].pack(fill="x", pady=(0, 10))
        
        # URL de portada
        ctk.CTkLabel(form_frame, text="URL Portada", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['portada'] = ctk.CTkEntry(form_frame, placeholder_text="URL de la imagen de portada")
        fields['portada'].pack(fill="x", pady=(0, 10))
        
        # Sinopsis
        ctk.CTkLabel(form_frame, text="Sinopsis", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", pady=(10, 5))
        fields['sinopsis'] = ctk.CTkTextbox(form_frame, height=100)
        fields['sinopsis'].pack(fill="x", pady=(0, 10))
        
        # Cargar datos si es edición
        if libro:
            fields['ean'].insert(0, libro[1] if len(libro) > 1 else "")
            fields['titulo'].insert(0, libro[2] if len(libro) > 2 else "")
            
            # Seleccionar autor
            if len(libro) > 3 and libro[3]:
                autor_nombre = libro[3]
                if autor_nombre in autores_list:
                    fields['autor'].set(autor_nombre)
            
            # Seleccionar editorial
            if len(libro) > 4 and libro[4]:
                editorial_nombre = libro[4]
                if editorial_nombre in editoriales_list:
                    fields['editorial'].set(editorial_nombre)
            
            fields['anyo'].insert(0, str(libro[5]) if len(libro) > 5 and libro[5] else "")
            fields['portada'].insert(0, libro[6] if len(libro) > 6 else "")
            
            if len(libro) > 7 and libro[7]:
                fields['sinopsis'].insert("0.0", libro[7])
        
        # Botones
        button_frame = ctk.CTkFrame(dialog)
        button_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        def guardar():
            try:
                # Validar campos obligatorios
                ean = fields['ean'].get().strip()
                titulo = fields['titulo'].get().strip()
                autor_nombre = fields['autor'].get()
                editorial_nombre = fields['editorial'].get()
                
                if not ean or not titulo or not autor_nombre or autor_nombre == "Seleccionar autor..." or not editorial_nombre or editorial_nombre == "Seleccionar editorial...":
                    messagebox.showerror("Error", "Por favor complete todos los campos obligatorios")
                    return
                
                # Obtener IDs de autor y editorial
                autor_id = None
                for aid, aname in self.autores_cache.items():
                    if aname == autor_nombre:
                        autor_id = aid
                        break
                
                editorial_id = None
                for eid, ename in self.editoriales_cache.items():
                    if ename == editorial_nombre:
                        editorial_id = eid
                        break
                
                if not autor_id or not editorial_id:
                    messagebox.showerror("Error", "Autor o editorial no válidos")
                    return
                
                # Obtener otros valores
                anyo_edicion = fields['anyo'].get().strip()
                estante_nombre = fields['estante'].get()
                portada_url = fields['portada'].get().strip()
                sinopsis = fields['sinopsis'].get("0.0", "end").strip()
                
                # Si es edición
                if libro:
                    sql = """
                        UPDATE core_titulos 
                        SET EAN = ?, titulo = ?, codiAutor_id = ?, codiEditorial_id = ?, 
                            anyoEdicion = ?, portada_cloudinary = ?, sinopsis = ?
                        WHERE id = ?
                    """
                    params = (ean, titulo, autor_id, editorial_id, anyo_edicion, portada_url, sinopsis, libro[0])
                else:
                    # Verificar EAN duplicado
                    existing = self.query_local("SELECT id FROM core_titulos WHERE EAN = ?", (ean,))
                    if existing:
                        messagebox.showerror("Error", f"Ya existe un libro con el EAN '{ean}'")
                        return
                    
                    sql = """
                        INSERT INTO core_titulos 
                        (EAN, titulo, codiAutor_id, codiEditorial_id, anyoEdicion, portada_cloudinary, sinopsis, created, updated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """
                    params = (ean, titulo, autor_id, editorial_id, anyo_edicion, portada_url, sinopsis)
                
                result = self.query_local(sql, params)
                
                if result is not None:
                    messagebox.showinfo("Éxito", "Libro guardado correctamente")
                    dialog.destroy()
                    self.cargar_libros()
                else:
                    messagebox.showerror("Error", "No se pudo guardar el libro")
                    
            except Exception as e:
                messagebox.showerror("Error", f"Error al guardar libro: {str(e)}")
        
        ctk.CTkButton(button_frame, text="Guardar", command=guardar, width=120).pack(side="right", padx=5)
        ctk.CTkButton(button_frame, text="Cancelar", command=dialog.destroy, width=120).pack(side="right", padx=5)
    
    # Métodos para nuevas opciones de menú
    def show_usuarios(self):
        self.clear_main_frame()
        self.highlight_nav_button("👥 Usuarios")
        
        header = ctk.CTkFrame(self.main_frame)
        header.pack(fill="x", padx=20, pady=(20, 10))
        ctk.CTkLabel(header, text="Gestión de Usuarios", font=ctk.CTkFont(size=28, weight="bold")).pack(side="left")
        
        info_frame = ctk.CTkFrame(self.main_frame)
        info_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(info_frame, text="🚧 Gestión de usuarios en desarrollo", font=ctk.CTkFont(size=16)).pack(pady=20)
    
    def show_sincronizacion(self):
        self.clear_main_frame()
        self.highlight_nav_button("🔄 Sincronización")
        
        header = ctk.CTkFrame(self.main_frame)
        header.pack(fill="x", padx=20, pady=(20, 10))
        ctk.CTkLabel(header, text="Sincronización de Datos", font=ctk.CTkFont(size=28, weight="bold")).pack(side="left")
        
        info_frame = ctk.CTkFrame(self.main_frame)
        info_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(info_frame, text="🚧 Sincronización en desarrollo", font=ctk.CTkFont(size=16)).pack(pady=20)
    
    def show_estadisticas(self):
        self.clear_main_frame()
        self.highlight_nav_button("📊 Estadísticas")
        
        header = ctk.CTkFrame(self.main_frame)
        header.pack(fill="x", padx=20, pady=(20, 10))
        ctk.CTkLabel(header, text="Estadísticas del Catálogo", font=ctk.CTkFont(size=28, weight="bold")).pack(side="left")
        
        info_frame = ctk.CTkFrame(self.main_frame)
        info_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(info_frame, text="🚧 Estadísticas en desarrollo", font=ctk.CTkFont(size=16)).pack(pady=20)

if __name__ == "__main__":
    app = CatalogoManagerSimple()
    app.mainloop()
