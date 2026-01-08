import { useState, useCallback } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface FleetImportProps {
  ownerId: string;
  onImportComplete?: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

interface ParsedVehicle {
  brand?: string;
  model?: string;
  year?: number;
  daily_price?: number;
  location_city?: string;
  location_country?: string;
  fuel_type?: string;
  transmission?: string;
  seats?: number;
  license_plate?: string;
  description?: string;
  [key: string]: any;
}

interface ImportResult {
  success: number;
  errors: { row: number; error: string }[];
}

const REQUIRED_FIELDS = ['brand', 'model', 'daily_price'];
const OPTIONAL_FIELDS = ['year', 'location_city', 'location_country', 'fuel_type', 'transmission', 'seats', 'license_plate', 'description', 'weekly_price', 'monthly_price'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS: Record<string, string> = {
  brand: 'Marque',
  model: 'Modèle',
  daily_price: 'Prix journalier',
  year: 'Année',
  location_city: 'Ville',
  location_country: 'Pays',
  fuel_type: 'Carburant',
  transmission: 'Transmission',
  seats: 'Places',
  license_plate: 'Immatriculation',
  description: 'Description',
  weekly_price: 'Prix hebdomadaire',
  monthly_price: 'Prix mensuel',
};

const FleetImport = ({ ownerId, onImportComplete }: FleetImportProps) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedVehicles, setParsedVehicles] = useState<ParsedVehicle[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);
      
      if (data.length < 2) {
        toast.error("Le fichier doit contenir au moins un en-tête et une ligne de données");
        return;
      }
      
      setHeaders(data[0]);
      setRawData(data.slice(1));
      
      // Auto-detect column mappings
      const autoMapping: ColumnMapping = {};
      data[0].forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        const matchedField = ALL_FIELDS.find(field => {
          const fieldVariants = [
            field,
            field.replace('_', ' '),
            FIELD_LABELS[field]?.toLowerCase()];
          return fieldVariants.some(variant => normalizedHeader.includes(variant || ''));
        });
        if (matchedField) {
          autoMapping[matchedField] = index.toString();
        }
      });
      setColumnMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(uploadedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
      handleFileUpload(droppedFile);
    } else {
      toast.error("Veuillez uploader un fichier CSV");
    }
  }, [handleFileUpload]);

  const handleMappingChange = (field: string, columnIndex: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnIndex,
    }));
  };

  const parseVehicles = () => {
    // Validate required fields are mapped
    const missingRequired = REQUIRED_FIELDS.filter(f => !columnMapping[f]);
    if (missingRequired.length > 0) {
      toast.error(`Colonnes requises manquantes: ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`);
      return;
    }

    const vehicles: ParsedVehicle[] = rawData.map(row => {
      const vehicle: ParsedVehicle = {};
      
      Object.entries(columnMapping).forEach(([field, columnIndex]) => {
        const value = row[parseInt(columnIndex)];
        if (value !== undefined && value !== '') {
          if (['year', 'daily_price', 'weekly_price', 'monthly_price', 'seats'].includes(field)) {
            vehicle[field] = parseInt(value.replace(/[^\d]/g, '')) || undefined;
          } else {
            vehicle[field] = value;
          }
        }
      });
      
      return vehicle;
    });

    setParsedVehicles(vehicles);
    setStep('preview');
  };

  const importVehicles = async () => {
    setStep('importing');
    const results: ImportResult = { success: 0, errors: [] };

    for (let i = 0; i < parsedVehicles.length; i++) {
      const vehicle = parsedVehicles[i];
      
      // Validate required fields
      if (!vehicle.brand || !vehicle.model || !vehicle.daily_price) {
        results.errors.push({ row: i + 1, error: 'Champs requis manquants (marque, modèle, prix)' });
        continue;
      }

      const vehicleData: any = {
        owner_id: ownerId,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year || new Date().getFullYear(),
        daily_price: vehicle.daily_price,
        weekly_price: vehicle.weekly_price || vehicle.daily_price * 6,
        monthly_price: vehicle.monthly_price || vehicle.daily_price * 25,
        location_city: vehicle.location_city || 'Dakar',
        location_country: vehicle.location_country || 'senegal',
        fuel_type: vehicle.fuel_type || 'essence',
        transmission: vehicle.transmission || 'manual',
        seats: vehicle.seats || 5,
        license_plate: vehicle.license_plate || null,
        description: vehicle.description || null,
        status: 'pending',
        features: [],
      };

      const { error } = await supabase.from('vehicles').insert(vehicleData);
      
      if (error) {
        results.errors.push({ row: i + 1, error: error.message });
      } else {
        results.success++;
      }
    }

    setImportResult(results);
    setStep('complete');
    
    if (results.success > 0) {
      toast.success(`${results.success} véhicule(s) importé(s) avec succès`);
      onImportComplete?.();
    }
    
    if (results.errors.length > 0) {
      toast.error(`${results.errors.length} erreur(s) lors de l'import`);
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = ALL_FIELDS.map(f => FIELD_LABELS[f]);
    const exampleRow = ['Toyota', 'Corolla', '35000', '2023', 'Dakar', 'senegal', 'essence', 'automatic', '5', 'DK-1234-AB', 'Belle voiture en parfait état', '200000', '800000'];
    
    const csv = [templateHeaders.join(';'), exampleRow.join(';')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_flotte.csv';
    link.click();
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedVehicles([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Step: Upload */}
      {step === 'upload' && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importer votre flotte
            </CardTitle>
            <CardDescription>
              Importez vos véhicules depuis un fichier Excel ou CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Download Template */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Télécharger le modèle</p>
                <p className="text-sm text-muted-foreground">Utilisez notre modèle CSV pour formater vos données</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-glass-border'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Glissez votre fichier ici</p>
              <p className="text-sm text-muted-foreground mb-4">ou</p>
              <label>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <Button asChild>
                  <span>Parcourir les fichiers</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">Formats supportés: CSV, TXT (séparateur: virgule ou point-virgule)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle>Mapper les colonnes</CardTitle>
            <CardDescription>
              Associez les colonnes de votre fichier aux champs GoMonto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm">
                <strong>Fichier:</strong> {file?.name} • <strong>{rawData.length}</strong> véhicules détectés
              </p>
            </div>

            <div className="grid gap-4">
              {ALL_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-4">
                  <div className="w-40 flex items-center gap-2">
                    <span className="font-medium">{FIELD_LABELS[field]}</span>
                    {REQUIRED_FIELDS.includes(field) && (
                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={columnMapping[field] || ''}
                    onValueChange={(value) => handleMappingChange(field, value)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Sélectionner une colonne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Non mappé --</SelectItem>
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header} (ex: {rawData[0]?.[index] || '-'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={reset}>Annuler</Button>
              <Button onClick={parseVehicles}>
                Prévisualiser
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle>Prévisualisation</CardTitle>
            <CardDescription>
              Vérifiez les données avant l'import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" />
              <span><strong>{parsedVehicles.length}</strong> véhicules prêts à être importés</span>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Prix/jour</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedVehicles.slice(0, 10).map((vehicle, index) => {
                    const isValid = vehicle.brand && vehicle.model && vehicle.daily_price;
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{vehicle.brand || '-'}</TableCell>
                        <TableCell>{vehicle.model || '-'}</TableCell>
                        <TableCell>{vehicle.year || '-'}</TableCell>
                        <TableCell>{vehicle.daily_price ? `${vehicle.daily_price.toLocaleString()} FCFA` : '-'}</TableCell>
                        <TableCell>{vehicle.location_city || '-'}</TableCell>
                        <TableCell>
                          {isValid ? (
                            <Badge variant="outline" className="text-green-600"><Check className="w-3 h-3 mr-1" />Valide</Badge>
                          ) : (
                            <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Incomplet</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {parsedVehicles.length > 10 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  + {parsedVehicles.length - 10} autres véhicules...
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>Retour</Button>
              <Button onClick={importVehicles}>
                Importer {parsedVehicles.length} véhicules
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <Card className="glass-card border-glass-border">
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Import en cours...</h3>
            <p className="text-muted-foreground">Veuillez patienter</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === 'complete' && importResult && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success > 0 ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              Import terminé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-muted-foreground">Véhicules importés</div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 text-center">
                <div className="text-3xl font-bold text-destructive">{importResult.errors.length}</div>
                <div className="text-sm text-muted-foreground">Erreurs</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Erreurs détaillées:</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="p-2 rounded bg-destructive/10 text-sm">
                      <strong>Ligne {err.row}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={reset} className="w-full">
              Nouvel import
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FleetImport;
