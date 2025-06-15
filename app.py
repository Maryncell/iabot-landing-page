from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from flask_cors import CORS # <--- NUEVO: Importar CORS

# Cargar variables de entorno del archivo .env
load_dotenv()

app = Flask(__name__, static_folder='dist')
CORS(app) # <--- NUEVO: Inicializar CORS con tu aplicación Flask.
          # Esto habilitará CORS para todas las rutas y orígenes por defecto.
          # Para producción, se recomienda configurar orígenes específicos.

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///site.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False 

db = SQLAlchemy(app)

# Definición del modelo para Planes
class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    precio = db.Column(db.Float, nullable=False)
    descripcion = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Plan {self.nombre}>'

# Definición del modelo para Funciones Adicionales
class Feature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    precio = db.Column(db.Float, nullable=False)
    descripcion = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Feature {self.nombre}>'


# Rutas para servir el front-end
@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

# Endpoint para el formulario de contacto
@app.route('/api/contacto', methods=['POST'])
def contacto():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No se recibieron datos"}), 400

    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    plan = data.get('plan')
    message = data.get('message')
    selected_features = data.get('selectedFeatures', [])
    total_price = data.get('totalPrice')

    print(f"Datos recibidos del formulario:")
    print(f"  Nombre: {name}")
    print(f"  Email: {email}")
    print(f"  Teléfono: {phone}")
    print(f"  Plan seleccionado: {plan}")
    print(f"  Funciones Adicionales Seleccionadas: {selected_features}")
    print(f"  Precio Total Estimado: {total_price}")
    print(f"  Mensaje: {message}")

    return jsonify({"status": "success", "message": f"Consulta de {name} sobre el plan {plan} recibida. Precio estimado: ${total_price}"}), 200

# --- ENDPOINTS PARA LA BASE DE DATOS (PLANES) ---

# Endpoint GET para obtener todos los planes
@app.route('/api/planes', methods=['GET'])
def get_planes():
    try:
        planes = Plan.query.order_by(Plan.id).all()
        planes_data = [
            {"id": p.id, "nombre": p.nombre, "precio": p.precio, "descripcion": p.descripcion}
            for p in planes
        ]
        return jsonify(planes_data), 200
    except Exception as e:
        print(f"Error al obtener planes: {e}")
        return jsonify({"error": "Error interno del servidor al obtener planes"}), 500

# Endpoint POST para añadir un nuevo plan (útil para pruebas o administración)
@app.route('/api/planes', methods=['POST'])
def add_plan():
    data = request.get_json()
    if not data or not all(key in data for key in ['nombre', 'precio']):
        return jsonify({"error": "Faltan datos de nombre o precio"}), 400
    
    try:
        existing_plan = Plan.query.filter_by(nombre=data['nombre']).first()
        if existing_plan:
            return jsonify({"error": f"El plan '{data['nombre']}' ya existe"}), 409

        new_plan = Plan(
            nombre=data['nombre'],
            precio=float(data['precio']),
            descripcion=data.get('descripcion', '')
        )
        db.session.add(new_plan)
        db.session.commit()
        return jsonify({
            "message": "Plan añadido exitosamente",
            "plan": {"id": new_plan.id, "nombre": new_plan.nombre, "precio": new_plan.precio, "descripcion": new_plan.descripcion}
        }), 201
    except ValueError:
        return jsonify({"error": "El precio debe ser un número válido"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error al añadir plan: {e}")
        return jsonify({"error": "Error interno del servidor al añadir plan"}), 500


# --- ENDPOINTS PARA LAS FUNCIONES ADICIONALES ---

# Endpoint GET para obtener todas las funciones adicionales
@app.route('/api/features', methods=['GET'])
def get_features():
    try:
        features = Feature.query.order_by(Feature.id).all()
        features_data = [
            {"id": f.id, "nombre": f.nombre, "precio": f.precio, "descripcion": f.descripcion}
            for f in features
        ]
        return jsonify(features_data), 200
    except Exception as e:
        print(f"Error al obtener funciones: {e}")
        return jsonify({"error": "Error interno del servidor al obtener funciones"}), 500

# Endpoint POST para añadir una nueva función (útil para administración)
@app.route('/api/features', methods=['POST'])
def add_feature():
    data = request.get_json()
    if not data or not all(key in data for key in ['nombre', 'precio']):
        return jsonify({"error": "Faltan datos de nombre o precio"}), 400
    
    try:
        existing_feature = Feature.query.filter_by(nombre=data['nombre']).first()
        if existing_feature:
            return jsonify({"error": f"La función '{data['nombre']}' ya existe"}), 409

        new_feature = Feature(
            nombre=data['nombre'],
            precio=float(data['precio']),
            descripcion=data.get('descripcion', '')
        )
        db.session.add(new_feature)
        db.session.commit()
        return jsonify({
            "message": "Función añadida exitosamente",
            "feature": {"id": new_feature.id, "nombre": new_feature.nombre, "precio": new_feature.precio, "descripcion": new_feature.descripcion}
        }), 201
    except ValueError:
        return jsonify({"error": "El precio debe ser un número válido"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error al añadir función: {e}")
        return jsonify({"error": "Error interno del servidor al añadir función"}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()

        if Plan.query.count() == 0:
            print("No se encontraron planes. Insertando planes iniciales...")
            plan_basico = Plan(
                nombre="Básico",
                precio=100.00,
                descripcion=(
                    "Bot web básico\n"
                    "- 50 conversaciones/mes\n"
                    "- Soporte por email\n"
                    "- Implementación rápida"
                )
            )
            plan_avanzado = Plan(
                nombre="Avanzado",
                precio=300.00,
                descripcion=(
                    "Multicanal + alertas\n"
                    "- 500 conversaciones/mes\n"
                    "- Integración WhatsApp/Telegram\n"
                    "- Alertas por email/SMS\n"
                    "- Reportes avanzados\n"
                    "- Acceso API básico"
                )
            )
            plan_premium = Plan(
                nombre="Premium",
                precio=500.00,
                descripcion=(
                    "Bot IA + soporte + tickets\n"
                    "- Conversaciones ilimitadas\n"
                    "- Integración con IA generativa (OpenAI/Gemini)\n"
                    "- Soporte 24/7 y SLA\n"
                    "- Sistema de tickets dedicado\n"
                    "- Personalización a medida del bot\n"
                    "- Agentes humanos ilimitados"
                )
            )
            db.session.add_all([plan_basico, plan_avanzado, plan_premium])
            db.session.commit()
            print("Planes iniciales añadidos a la base de datos.")
        else:
            print("La base de datos ya contiene planes.")

        if Feature.query.count() == 0:
            print("No se encontraron funciones adicionales. Insertando funciones iniciales...")
            feature_whatsapp = Feature(nombre="Integración WhatsApp", precio=50.00, descripcion="Permite al bot operar en WhatsApp.")
            feature_telegram = Feature(nombre="Integración Telegram", precio=30.00, descripcion="Extiende el bot a Telegram.")
            feature_alerts_sms = Feature(nombre="Alertas SMS", precio=20.00, descripcion="Notificaciones importantes por SMS.")
            feature_agents = Feature(nombre="Agentes Humanos (extra)", precio=100.00, descripcion="Soporte para transferencia a agentes humanos (por 5 agentes).")
            feature_custom_reports = Feature(nombre="Reportes Personalizados", precio=75.00, descripcion="Generación de reportes a medida de tus KPIs.")
            
            db.session.add_all([
                feature_whatsapp,
                feature_telegram,
                feature_alerts_sms,
                feature_agents,
                feature_custom_reports
            ])
            db.session.commit()
            print("Funciones adicionales iniciales añadidas a la base de datos.")
        else:
            print("La base de datos ya contiene funciones adicionales. No se insertan funciones iniciales.")

    app.run(port=3000, debug=True)