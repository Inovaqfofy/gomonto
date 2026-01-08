# Architecture - gomonto

## Diagramme Principal

```mermaid
graph TD
    subgraph Frontend["🖥️ Frontend (React)"]
        UI[Interface Utilisateur]
        Components[Composants React]
        Hooks[Hooks & State]
    end
    
    subgraph Backend["⚙️ Backend (Express)"]
        API[API REST]
        ai_damage_detection[ai-damage-detection]
        cinetpay_check_status[cinetpay-check-status]
        cinetpay_initiate[cinetpay-initiate]
        cinetpay_webhook[cinetpay-webhook]
        compliance_notifications[compliance-notifications]
    end
    
    
    
    UI --> Components
    Components --> Hooks
    Hooks --> API
    
```

## Flux de Données

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant A as API
    
    
    U->>F: Action utilisateur
    F->>A: Requête API
    
    
    A-->>F: Response JSON
    F-->>U: Mise à jour UI
```
