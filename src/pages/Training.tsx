import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Video, FileText, PlayCircle } from "lucide-react";

const Training = () => {
  const courses = [
    { title: "Introdução ao Programa", description: "Conheça como funciona o programa de afiliados", duration: "15 min", type: "video" },
    { title: "Como Gerar Links", description: "Aprenda a criar e compartilhar seus links de afiliado", duration: "10 min", type: "video" },
    { title: "Estratégias de Divulgação", description: "Dicas para promover seus links nas redes sociais", duration: "20 min", type: "video" },
    { title: "Guia de Comissões", description: "Entenda como funcionam as comissões e saques", duration: "5 min", type: "pdf" },
  ];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Treinamento</h1>
          <p className="text-muted-foreground">
            Aprenda tudo sobre o programa de afiliados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {course.type === "video" ? (
                    <PlayCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  {course.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {course.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Duração: {course.duration}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Entre em contato com nosso suporte para tirar dúvidas ou agendar
              uma sessão de treinamento personalizada.
            </p>
          </CardContent>
        </Card>
      </div>
  );
};

export default Training;
