import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  title?: string;
  columns?: number;
  rows?: number;
  showSearch?: boolean;
}

export const TableSkeleton = ({ 
  title, 
  columns = 5, 
  rows = 5,
  showSearch = false 
}: TableSkeletonProps) => {
  return (
    <Card>
      <CardHeader>
        {showSearch && <Skeleton className="h-10 w-full" />}
        {title && <Skeleton className="h-6 w-48" />}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(columns)].map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(rows)].map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {[...Array(columns)].map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
